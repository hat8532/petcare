package com.petcare.backend.domain.diagnosis;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DiagnosisImageStorageTest {

    @TempDir
    Path tempDirectory;

    @Test
    void savesAndReadsOpaqueImageKey() throws Exception {
        DiagnosisImageStorage storage = new DiagnosisImageStorage(tempDirectory);
        ValidatedDiagnosisImage image = new DiagnosisImageValidator()
                .validate(DiagnosisTestImages.pngMultipartFile());

        String key = storage.save(image, 7L);
        DiagnosisImageResource resource = storage.read(key);

        assertThat(key).matches("user-7/[a-f0-9-]{36}\\.png");
        assertThat(resource.contentType()).isEqualTo("image/png");
        assertThat(resource.bytes()).isNotEmpty();

        Path saved = tempDirectory.resolve(key);
        if (Files.getFileStore(saved).supportsFileAttributeView("posix")) {
            assertThat(Files.getPosixFilePermissions(saved))
                    .isEqualTo(PosixFilePermissions.fromString("rw-------"));
            assertThat(Files.getPosixFilePermissions(saved.getParent()))
                    .isEqualTo(PosixFilePermissions.fromString("rwx------"));
        }
    }

    @Test
    void rejectsPathTraversalKey() {
        DiagnosisImageStorage storage = new DiagnosisImageStorage(tempDirectory);

        assertThatThrownBy(() -> storage.read("../secret.png"))
                .isInstanceOf(DiagnosisImageException.class);
    }

    @Test
    void rejectsInvalidOwnerIdBeforeWriting() {
        DiagnosisImageStorage storage = new DiagnosisImageStorage(tempDirectory);
        ValidatedDiagnosisImage image = new DiagnosisImageValidator()
                .validate(DiagnosisTestImages.pngMultipartFile());

        assertThatThrownBy(() -> storage.save(image, 0L))
                .isInstanceOf(DiagnosisImageException.class);
    }

    @Test
    void enforcesPerUserQuotaAcrossConcurrentSaves() throws Exception {
        ValidatedDiagnosisImage image = new DiagnosisImageValidator()
                .validate(DiagnosisTestImages.pngMultipartFile());
        DiagnosisImageStorage storage = new DiagnosisImageStorage(
                tempDirectory,
                image.bytes().length,
                0);
        ExecutorService executor = Executors.newFixedThreadPool(8);

        try {
            List<Callable<Boolean>> attempts = new ArrayList<>();
            for (int index = 0; index < 8; index++) {
                attempts.add(() -> {
                    try {
                        storage.save(image, 9L);
                        return true;
                    } catch (DiagnosisImageException exception) {
                        return false;
                    }
                });
            }

            List<Future<Boolean>> results = executor.invokeAll(attempts);
            long successes = results.stream()
                    .filter(result -> {
                        try {
                            return result.get();
                        } catch (Exception exception) {
                            throw new AssertionError(exception);
                        }
                    })
                    .count();

            assertThat(successes).isEqualTo(1);
            try (var files = Files.list(tempDirectory.resolve("user-9"))) {
                assertThat(files.count()).isEqualTo(1);
            }
        } finally {
            executor.shutdownNow();
        }
    }
}
