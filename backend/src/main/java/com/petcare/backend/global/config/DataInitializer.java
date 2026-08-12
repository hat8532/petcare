package com.petcare.backend.global.config;

import com.petcare.backend.domain.community.CommunityPostDTO;
import com.petcare.backend.domain.community.CommunityPostMapper;
import com.petcare.backend.domain.hospital.HospitalDTO;
import com.petcare.backend.domain.hospital.HospitalMapper;
import com.petcare.backend.domain.news.NewsDTO;
import com.petcare.backend.domain.news.NewsMapper;
import com.petcare.backend.domain.pet.PetDTO;
import com.petcare.backend.domain.pet.PetMapper;
import com.petcare.backend.domain.timeline.TimelineCompareDTO;
import com.petcare.backend.domain.timeline.TimelineCompareMapper;
import com.petcare.backend.domain.user.UserDTO;
import com.petcare.backend.domain.user.UserMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserMapper userMapper;
    private final PetMapper petMapper;
    private final HospitalMapper hospitalMapper;
    private final TimelineCompareMapper timelineCompareMapper;
    private final NewsMapper newsMapper;
    private final CommunityPostMapper communityPostMapper;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserMapper userMapper,
                           PetMapper petMapper,
                           HospitalMapper hospitalMapper,
                           TimelineCompareMapper timelineCompareMapper,
                           NewsMapper newsMapper,
                           CommunityPostMapper communityPostMapper,
                           PasswordEncoder passwordEncoder) {
        this.userMapper = userMapper;
        this.petMapper = petMapper;
        this.hospitalMapper = hospitalMapper;
        this.timelineCompareMapper = timelineCompareMapper;
        this.newsMapper = newsMapper;
        this.communityPostMapper = communityPostMapper;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // 1. Initial User
        if (userMapper.countAll() == 0) {
            UserDTO user = UserDTO.builder()
                    .email("user@petcare.com")
                    .password(passwordEncoder.encode("1234"))
                    .nickname("초코마미")
                    .phone("010-1234-5678")
                    .provider("LOCAL")
                    .role("ROLE_USER")
                    .status("ACTIVE")
                    .build();
            userMapper.insert(user);
        }

        // 2. Initial Pet
        if (petMapper.countAll() == 0) {
            PetDTO pet = PetDTO.builder()
                    .userId(1L)
                    .name("초코")
                    .species("DOG")
                    .breed("푸들")
                    .age("4살")
                    .weight("3.8kg")
                    .icon("🐶")
                    .build();
            petMapper.insert(pet);
        }

        // 3. Initial 24h Emergency Hospitals (Nationwide Key Regions)
        if (hospitalMapper.countAll() == 0) {
            // 마포 / 신촌
            hospitalMapper.insert(HospitalDTO.builder()
                    .name("24시 웨스턴 동물의료센터")
                    .phone("02-701-7582")
                    .address("서울 마포구 신촌로 160 (대흥동)")
                    .latitude(37.5552)
                    .longitude(126.9423)
                    .isEmergency24h(true)
                    .businessHours("연중무휴 24시간 진료")
                    .rating(new BigDecimal("4.90"))
                    .reviewCount(128)
                    .naverPlaceUrl("https://map.naver.com/p/search/24시웨스턴동물의료센터")
                    .isActive(true)
                    .build());

            // 구로 / 가산디지털단지
            hospitalMapper.insert(HospitalDTO.builder()
                    .name("24시 구로 디지털 동물의료센터")
                    .phone("02-850-7582")
                    .address("서울 구로구 디지털로 300 (가산동)")
                    .latitude(37.4780)
                    .longitude(126.8835)
                    .isEmergency24h(true)
                    .businessHours("연중무휴 24시간 진료")
                    .rating(new BigDecimal("4.85"))
                    .reviewCount(112)
                    .naverPlaceUrl("https://map.naver.com/p/search/구로24시아동물병원")
                    .isActive(true)
                    .build());

            hospitalMapper.insert(HospitalDTO.builder()
                    .name("가산 스마트 24시 펫메디컬센터")
                    .phone("02-861-1119")
                    .address("서울 금천구 가산디지털1로 186")
                    .latitude(37.4745)
                    .longitude(126.8810)
                    .isEmergency24h(true)
                    .businessHours("연중무휴 24시간 진료")
                    .rating(new BigDecimal("4.78"))
                    .reviewCount(84)
                    .naverPlaceUrl("https://map.naver.com")
                    .isActive(true)
                    .build());

            // 강남 / 서초
            hospitalMapper.insert(HospitalDTO.builder()
                    .name("24시 강남 센트럴 동물의료센터")
                    .phone("02-540-7582")
                    .address("서울 강남구 테헤란로 152 (역삼동)")
                    .latitude(37.5000)
                    .longitude(127.0360)
                    .isEmergency24h(true)
                    .businessHours("연중무휴 24시간 진료")
                    .rating(new BigDecimal("4.95"))
                    .reviewCount(210)
                    .naverPlaceUrl("https://map.naver.com")
                    .isActive(true)
                    .build());

            // 중랑 / 동대문
            hospitalMapper.insert(HospitalDTO.builder()
                    .name("24시 로얄동물메디컬센터")
                    .phone("02-494-7582")
                    .address("서울 중랑구 망우로 247")
                    .latitude(37.5956)
                    .longitude(127.0864)
                    .isEmergency24h(true)
                    .businessHours("연중무휴 24시간 진료")
                    .rating(new BigDecimal("4.80"))
                    .reviewCount(96)
                    .naverPlaceUrl("https://map.naver.com/p/search/24시로얄동물메디컬센터")
                    .isActive(true)
                    .build());
        }

        // 4. Initial Timeline Compare Record
        if (timelineCompareMapper.countAll() == 0 && petMapper.countAll() > 0) {
            timelineCompareMapper.insert(TimelineCompareDTO.builder()
                    .petId(1L)
                    .beforeDate("8월 1일 진단")
                    .beforeImageUrl("https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80")
                    .afterDate("8월 6일 진단")
                    .afterImageUrl("https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80")
                    .progressStatus("IMPROVED")
                    .geminiAnalysis("[경과 비교 결과 요약]\n8월 1일 최초 진단 대비, 환부의 붉은 발적 및 각질 형태가 약 55% 감소하였으며 2차 진물 발생이 관찰되지 않아 뚜렷한 호전 양상을 보입니다.\n\n향후 케어 제안:\n현재 사용 중이신 약용 소독 처방을 4일 간 추가 유지해 주시고, 긁음 반응 방지를 위해 넥카라 착용을 지속해 주시기 바랍니다.")
                    .build());
        }

        // 5. Initial News
        if (newsMapper.countAll() == 0) {
            newsMapper.insert(NewsDTO.builder()
                    .category("건강/질병")
                    .badgeClass("badge-emerald")
                    .title("여름철 습한 날씨 강아지 귀/피부 습진 예방법 및 초기 관리 가이드")
                    .description("장마철 세균과 곰팡이 번식이 활발해짐에 따라 반려견 피부 발적 및 귀지 증가 시 대처법을 알아봅니다.")
                    .publishedDate("2026.08.06")
                    .source("수의학 헬스저널")
                    .newsUrl("https://news.naver.com")
                    .build());

            newsMapper.insert(NewsDTO.builder()
                    .category("사료/리콜")
                    .badgeClass("badge-rose")
                    .title("[긴급 알림] OO 수입 프리미엄 사료 일부 제조번호 자발적 리콜 안내")
                    .description("특정 제조 일자 제품에서 성분 비상 감지됨에 따라 수입사 자발적 회수 조치가 실시되었습니다.")
                    .publishedDate("2026.08.05")
                    .source("식품안전포털")
                    .newsUrl("https://news.naver.com")
                    .build());

            newsMapper.insert(NewsDTO.builder()
                    .category("안구케어")
                    .badgeClass("badge-indigo")
                    .title("고양이 안구 질환(결막염/각막염) 초기 증상 체크리스트 5가지")
                    .description("눈물 량이 갑자기 늘거나 눈을 제대로 뜨지 못할 때 가정에서 살펴볼 5가지 이상 징후입니다.")
                    .publishedDate("2026.08.04")
                    .source("펫메디컬 뉴스")
                    .newsUrl("https://news.naver.com")
                    .build());
        }

        // 6. Initial Community Posts
        if (communityPostMapper.countAll() == 0) {
            communityPostMapper.insert(CommunityPostDTO.builder()
                    .authorName("초코마미")
                    .petInfo("초코 (푸들 4살)")
                    .title("귀 뒤쪽 피부 습진 AI 진단 리포트 첨부해요! 비슷한 증상 경험 있으신 분 계실까요?")
                    .attachedReport("Vision AI: 농피증 (84.5%) · 위험도: CAUTION")
                    .content("3일 전부터 부어올라서 진단해봤더니 농피증이 나왔네요. 소독해주고 계신 분 계신가요?")
                    .commentsCount(8)
                    .likesCount(14)
                    .timeAgo("10분 전")
                    .build());

            communityPostMapper.insert(CommunityPostDTO.builder()
                    .authorName("냥냥이아빠")
                    .petInfo("나비 (코숏 2살)")
                    .title("눈물 눈꼽 심해서 AI 진단해봤더니 안구 결막염 나왔는데 소독 꿀팁 공유합니다.")
                    .attachedReport("Vision AI: 급성 결막염 (78.2%) · 위험도: CAUTION")
                    .content("인공눈물로 세정 후 약 넣어주니까 금방 나아지네요!")
                    .commentsCount(12)
                    .likesCount(29)
                    .timeAgo("1시간 전")
                    .build());
        }
    }
}
