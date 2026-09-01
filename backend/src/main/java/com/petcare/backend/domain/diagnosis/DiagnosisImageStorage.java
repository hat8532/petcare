package com.petcare.backend.domain.diagnosis;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.channels.FileChannel;
import java.nio.channels.FileLock;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;
import java.util.stream.Stream;

@Component
public class DiagnosisImageStorage {

    private static final Pattern SAFE_KEY = Pattern.compile(
            "(?:user-[1-9][0-9]*/)?[a-f0-9-]{36}\\.(jpg|png|webp)");
    private static final long DEFAULT_MAX_BYTES_PER_USER = 256L * 1024 * 1024;
    private static final long DEFAULT_MINIMUM_FREE_BYTES = 512L * 1024 * 1024;
    private static final String STORAGE_LOCK_FILE = ".storage.lock";
    private static final ReentrantLock JVM_STORAGE_LOCK = new ReentrantLock();
    private static final Set<PosixFilePermission> DIRECTORY_PERMISSIONS =
            PosixFilePermissions.fromString("rwx------");
    private static final Set<PosixFilePermission> FILE_PERMISSIONS =
            PosixFilePermissions.fromString("rw-------");
    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "jpg", "image/jpeg",
            "png", "image/png",
            "webp", "image/webp");

    private final Path root;
    private final long maxBytesPerUser;
    private final long minimumFreeBytes;

    @Autowired
    public DiagnosisImageStorage(
            @Value("${diagnosis.image-storage.root:}") String configuredRoot,
            @Value("${diagnosis.image-storage.max-bytes-per-user:268435456}") long maxBytesPerUser,
            @Value("${diagnosis.image-storage.minimum-free-bytes:536870912}") long minimumFreeBytes) {
        String defaultRoot = Path.of(
                System.getProperty("user.home"), ".petcare", "diagnosis-images").toString();
        this.root = Path.of(configuredRoot == null || configuredRoot.isBlank() ? defaultRoot : configuredRoot)
                .toAbsolutePath()
                .normalize();
        this.maxBytesPerUser = positiveOrDefault(maxBytesPerUser, DEFAULT_MAX_BYTES_PER_USER);
        this.minimumFreeBytes = positiveOrDefault(minimumFreeBytes, DEFAULT_MINIMUM_FREE_BYTES);
    }

    DiagnosisImageStorage(Path root) {
        this(root, DEFAULT_MAX_BYTES_PER_USER, 0);
    }

    DiagnosisImageStorage(Path root, long maxBytesPerUser, long minimumFreeBytes) {
        this.root = root.toAbsolutePath().normalize();
        this.maxBytesPerUser = maxBytesPerUser;
        this.minimumFreeBytes = minimumFreeBytes;
    }

    public String save(ValidatedDiagnosisImage image, Long userId) {
        if (userId == null || userId <= 0) {
            throw new DiagnosisImageException(HttpStatus.BAD_REQUEST, "진단 Image 소유자 정보가 올바르지 않습니다.");
        }
        String key = "user-" + userId + "/" + UUID.randomUUID() + "." + image.extension();
        Path target = resolve(key);
        JVM_STORAGE_LOCK.lock();
        try {
            Files.createDirectories(root);
            secureDirectory(root);
            Path lockFile = root.resolve(STORAGE_LOCK_FILE);

            try (FileChannel lockChannel = FileChannel.open(
                    lockFile,
                    StandardOpenOption.CREATE,
                    StandardOpenOption.WRITE,
                    LinkOption.NOFOLLOW_LINKS);
                 FileLock ignored = lockChannel.lock()) {
                secureFile(lockFile);
                Path userRoot = target.getParent();
                Files.createDirectories(userRoot);
                secureDirectory(userRoot);
                verifyCapacity(userRoot, image.bytes().length);
                writeNewFile(target, image.bytes());
            }
            return key;
        } catch (IOException exception) {
            deleteQuietly(key);
            throw new DiagnosisImageException(
                    HttpStatus.INSUFFICIENT_STORAGE,
                    "진단 Image를 안전하게 보관하지 못했습니다.");
        } finally {
            JVM_STORAGE_LOCK.unlock();
        }
    }

    public DiagnosisImageResource read(String key) {
        Path target = resolve(key);
        try {
            if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) {
                throw new DiagnosisImageException(HttpStatus.NOT_FOUND, "저장된 진단 Image를 찾을 수 없습니다.");
            }
            byte[] bytes = Files.readAllBytes(target);
            if (bytes.length == 0 || bytes.length > DiagnosisImageValidator.MAX_IMAGE_BYTES) {
                throw new DiagnosisImageException(HttpStatus.NOT_FOUND, "저장된 진단 Image가 올바르지 않습니다.");
            }
            String extension = key.substring(key.lastIndexOf('.') + 1);
            return new DiagnosisImageResource(bytes, CONTENT_TYPES.get(extension));
        } catch (DiagnosisImageException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new DiagnosisImageException(HttpStatus.NOT_FOUND, "저장된 진단 Image를 읽을 수 없습니다.");
        }
    }

    public void deleteQuietly(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (RuntimeException | IOException ignored) {
            // DB 저장 실패 복구 중의 File 정리는 원래 예외를 가리지 않는다.
        }
    }

    private Path resolve(String key) {
        if (key == null || !SAFE_KEY.matcher(key).matches()) {
            throw new DiagnosisImageException(HttpStatus.NOT_FOUND, "저장된 진단 Image 경로가 올바르지 않습니다.");
        }
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root)
                || resolved.getNameCount() < root.getNameCount() + 1
                || resolved.getNameCount() > root.getNameCount() + 2) {
            throw new DiagnosisImageException(HttpStatus.NOT_FOUND, "저장된 진단 Image 경로가 올바르지 않습니다.");
        }
        return resolved;
    }

    private void verifyCapacity(Path userRoot, long incomingBytes) throws IOException {
        long currentBytes;
        try (Stream<Path> paths = Files.list(userRoot)) {
            currentBytes = paths
                    .filter(path -> Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS))
                    .mapToLong(path -> {
                        try {
                            return Files.size(path);
                        } catch (IOException exception) {
                            return maxBytesPerUser;
                        }
                    })
                    .sum();
        }
        if (currentBytes > maxBytesPerUser - incomingBytes
                || Files.getFileStore(userRoot).getUsableSpace() < minimumFreeBytes + incomingBytes) {
            throw new DiagnosisImageException(
                    HttpStatus.INSUFFICIENT_STORAGE,
                    "진단 Image 보관 한도에 도달했습니다. 기존 기록 보관 정책을 확인해 주세요.");
        }
    }

    private void secureDirectory(Path directory) throws IOException {
        if (Files.isSymbolicLink(directory)) {
            throw new IOException("Symbolic link storage directory is not allowed.");
        }
        if (supportsPosix(directory)) {
            Files.setPosixFilePermissions(directory, DIRECTORY_PERMISSIONS);
        }
    }

    private void secureFile(Path file) throws IOException {
        if (Files.isSymbolicLink(file)) {
            throw new IOException("Symbolic link storage file is not allowed.");
        }
        if (supportsPosix(file)) {
            Files.setPosixFilePermissions(file, FILE_PERMISSIONS);
        }
    }

    private void writeNewFile(Path target, byte[] bytes) throws IOException {
        if (supportsPosix(target.getParent())) {
            Files.createFile(target, PosixFilePermissions.asFileAttribute(FILE_PERMISSIONS));
            Files.write(target, bytes, StandardOpenOption.WRITE);
            return;
        }
        Files.write(target, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
    }

    private boolean supportsPosix(Path path) throws IOException {
        return Files.getFileStore(path).supportsFileAttributeView("posix");
    }

    private static long positiveOrDefault(long configured, long fallback) {
        return configured > 0 ? configured : fallback;
    }

}
