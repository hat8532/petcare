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

            // posts.user_id가 users를 참조하므로 커뮤니티 씨앗 글의 두 번째 작성자도 실제로 만들어 둔다
            UserDTO user2 = UserDTO.builder()
                    .email("user2@petcare.com")
                    .password(passwordEncoder.encode("1234"))
                    .nickname("냥냥이아빠")
                    .phone("010-2345-6789")
                    .provider("LOCAL")
                    .role("ROLE_USER")
                    .status("ACTIVE")
                    .build();
            userMapper.insert(user2);
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

            PetDTO pet2 = PetDTO.builder()
                    .userId(2L)
                    .name("나비")
                    .species("CAT")
                    .breed("코숏")
                    .age("2살")
                    .weight("4.2kg")
                    .icon("🐱")
                    .build();
            petMapper.insert(pet2);
        }

        // 3. Initial 24h Emergency Hospitals — 제거됨
        //
        // 기존 seed 병원 5곳은 실존하지 않는 데이터였다.
        // 네이버 지역검색으로 확인한 결과:
        //   - "24시 구로 디지털 동물의료센터", "24시 강남 센트럴 동물의료센터": 검색 결과 0건
        //   - "24시 웨스턴 동물의료센터": 실존하나 주소가 신촌로 110 (seed는 160)
        // 전화번호는 4곳이 뒷자리 7582로 동일했고, 평점·리뷰·영업시간도 임의값이었다.
        //
        // 병원 정보는 NaverLocalSearchService(네이버 지역검색)에서 조회한다.

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
            // posts 테이블은 작성자/반려동물을 id로 참조한다.
            // 댓글수·좋아요수는 comments/post_likes에서 세고, timeAgo는 created_at으로 계산하므로 저장하지 않는다.
            communityPostMapper.insert(CommunityPostDTO.builder()
                    .userId(1L)
                    .petId(1L)
                    .title("귀 뒤쪽 피부 습진 AI 진단 리포트 첨부해요! 비슷한 증상 경험 있으신 분 계실까요?")
                    .content("3일 전부터 부어올라서 진단해봤더니 농피증이 나왔네요. 소독해주고 계신 분 계신가요?")
                    .build());

            communityPostMapper.insert(CommunityPostDTO.builder()
                    .userId(2L)
                    .petId(2L)
                    .title("눈물 눈꼽 심해서 AI 진단해봤더니 안구 결막염 나왔는데 소독 꿀팁 공유합니다.")
                    .content("인공눈물로 세정 후 약 넣어주니까 금방 나아지네요!")
                    .build());
        }
    }
}
