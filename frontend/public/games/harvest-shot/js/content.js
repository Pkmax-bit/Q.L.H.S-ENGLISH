// PROTOTYPE - Harvest Shot content data
(function (global) {
  const FILL_STAGES = [
    {
      id: "f1", title: "Màn 1 — Animals", reward: 40,
      questions: [
        { q: "A ___ says meow.", a: "cat", wrong: ["dog", "bird", "fish"], vi: "Con ___ kêu meo meo.", hint: "/kæt/" },
        { q: "A ___ barks.", a: "dog", wrong: ["cat", "cow", "pig"], vi: "Con ___ sủa.", hint: "/dɒɡ/" },
        { q: "A ___ can fly.", a: "bird", wrong: ["fish", "frog", "cat"], vi: "Con ___ biết bay.", hint: "/bɜːd/" },
        { q: "A ___ swims in water.", a: "fish", wrong: ["bird", "dog", "lion"], vi: "Con ___ bơi dưới nước.", hint: "/fɪʃ/" },
        { q: "A ___ is big and gray.", a: "elephant", wrong: ["mouse", "cat", "bird"], vi: "Con ___ to và xám.", hint: "/ˈelɪfənt/" },
        { q: "A ___ has a long neck.", a: "giraffe", wrong: ["zebra", "horse", "bear"], vi: "Con ___ cổ dài.", hint: "/dʒɪˈrɑːf/" },
        { q: "A ___ likes honey.", a: "bear", wrong: ["wolf", "fox", "duck"], vi: "Con ___ thích mật ong.", hint: "/beə/" },
        { q: "A ___ says moo.", a: "cow", wrong: ["pig", "sheep", "goat"], vi: "Con ___ kêu ụm bò.", hint: "/kaʊ/" },
        { q: "A ___ hops.", a: "rabbit", wrong: ["turtle", "snake", "owl"], vi: "Con ___ nhảy lò cò.", hint: "/ˈræbɪt/" },
        { q: "A ___ has black and white stripes.", a: "zebra", wrong: ["lion", "tiger", "horse"], vi: "Con ___ có sọc đen trắng.", hint: "/ˈzebrə/" },
      ],
    },
    {
      id: "f2", title: "Màn 2 — Colors & things", reward: 45,
      questions: [
        { q: "The sky is ___.", a: "blue", wrong: ["red", "green", "black"], vi: "Bầu trời màu ___.", hint: "/bluː/" },
        { q: "Grass is ___.", a: "green", wrong: ["blue", "yellow", "pink"], vi: "Cỏ màu ___.", hint: "/ɡriːn/" },
        { q: "The sun is ___.", a: "yellow", wrong: ["purple", "gray", "brown"], vi: "Mặt trời màu ___.", hint: "/ˈjeləʊ/" },
        { q: "A stop sign is ___.", a: "red", wrong: ["blue", "green", "white"], vi: "Biển stop màu ___.", hint: "/red/" },
        { q: "Snow is ___.", a: "white", wrong: ["black", "orange", "blue"], vi: "Tuyết màu ___.", hint: "/waɪt/" },
        { q: "I write with a ___.", a: "pen", wrong: ["cup", "book", "bag"], vi: "Tôi viết bằng ___.", hint: "/pen/" },
        { q: "I sit on a ___.", a: "chair", wrong: ["table", "door", "window"], vi: "Tôi ngồi trên ___.", hint: "/tʃeə/" },
        { q: "I open a ___.", a: "door", wrong: ["wall", "floor", "roof"], vi: "Tôi mở ___.", hint: "/dɔː/" },
        { q: "I drink from a ___.", a: "cup", wrong: ["book", "hat", "ball"], vi: "Tôi uống từ ___.", hint: "/kʌp/" },
        { q: "I read a ___.", a: "book", wrong: ["sock", "plate", "shoe"], vi: "Tôi đọc ___.", hint: "/bʊk/" },
      ],
    },
    {
      id: "f3", title: "Màn 3 — School", reward: 50,
      questions: [
        { q: "I go to ___ every day.", a: "school", wrong: ["beach", "market", "cinema"], vi: "Tôi đến ___ mỗi ngày.", hint: "/skuːl/" },
        { q: "A ___ teaches students.", a: "teacher", wrong: ["doctor", "driver", "cook"], vi: "___ dạy học sinh.", hint: "/ˈtiːtʃə/" },
        { q: "I write in my ___.", a: "notebook", wrong: ["backpack", "eraser", "pencil"], vi: "Tôi viết vào ___.", hint: "/ˈnəʊtbʊk/" },
        { q: "Two plus two equals ___.", a: "four", wrong: ["five", "three", "nine"], vi: "Hai cộng hai bằng ___.", hint: "/fɔː/" },
        { q: "We eat lunch at ___.", a: "noon", wrong: ["midnight", "dawn", "evening"], vi: "Chúng tôi ăn trưa lúc ___.", hint: "/nuːn/" },
        { q: "Please open your ___.", a: "book", wrong: ["shoe", "window", "bag"], vi: "Hãy mở ___ của bạn.", hint: "/bʊk/" },
        { q: "A ___ has many word meanings.", a: "dictionary", wrong: ["calendar", "notebook", "ruler"], vi: "___ có nhiều nghĩa từ.", hint: "/ˈdɪkʃənri/" },
        { q: "Raise your ___ to answer.", a: "hand", wrong: ["foot", "head", "arm"], vi: "Giơ ___ lên để trả lời.", hint: "/hænd/" },
        { q: "Class starts at ___ o'clock.", a: "eight", wrong: ["seven", "nine", "ten"], vi: "Lớp bắt đầu lúc ___ giờ.", hint: "/eɪt/" },
        { q: "I use a ___ to draw a straight line.", a: "ruler", wrong: ["eraser", "crayon", "glue"], vi: "Tôi dùng ___ để kẻ đường thẳng.", hint: "/ˈruːlə/" },
      ],
    },
    {
      id: "f4", title: "Màn 4 — Verbs", reward: 55,
      questions: [
        { q: "I ___ water every day.", a: "drink", wrong: ["eat", "sleep", "run"], vi: "Tôi ___ nước mỗi ngày.", hint: "/drɪŋk/" },
        { q: "Birds can ___.", a: "fly", wrong: ["swim", "drive", "write"], vi: "Chim biết ___.", hint: "/flaɪ/" },
        { q: "I ___ my teeth in the morning.", a: "brush", wrong: ["wash", "kick", "cook"], vi: "Tôi ___ răng buổi sáng.", hint: "/brʌʃ/" },
        { q: "Please ___ the door.", a: "close", wrong: ["open", "eat", "sing"], vi: "Hãy ___ cửa lại.", hint: "/kləʊz/" },
        { q: "Babies ___ when they are hungry.", a: "cry", wrong: ["laugh", "sleep", "walk"], vi: "Em bé ___ khi đói.", hint: "/kraɪ/" },
        { q: "We ___ football on Sunday.", a: "play", wrong: ["watch", "cook", "read"], vi: "Chúng tôi ___ bóng đá Chủ nhật.", hint: "/pleɪ/" },
        { q: "I ___ English at school.", a: "learn", wrong: ["teach", "forget", "sing"], vi: "Tôi ___ tiếng Anh ở trường.", hint: "/lɜːn/" },
        { q: "Fish ___ in the river.", a: "swim", wrong: ["fly", "climb", "run"], vi: "Cá ___ dưới sông.", hint: "/swɪm/" },
        { q: "I ___ my homework after school.", a: "do", wrong: ["make", "play", "sleep"], vi: "Tôi ___ bài tập sau giờ học.", hint: "/duː/" },
        { q: "We ___ to music.", a: "listen", wrong: ["look", "speak", "write"], vi: "Chúng tôi ___ nhạc.", hint: "/ˈlɪsn/" },
      ],
    },
    {
      id: "f5", title: "Màn 5 — Daily English", reward: 60,
      questions: [
        { q: "Good ___! (morning greeting)", a: "morning", wrong: ["night", "evening", "afternoon"], vi: "Chào buổi ___!", hint: "/ˈmɔːnɪŋ/" },
        { q: "How ___ you?", a: "are", wrong: ["is", "am", "be"], vi: "Bạn khỏe ___?", hint: "/ɑː/" },
        { q: "I am ___ to meet you.", a: "happy", wrong: ["sad", "angry", "tired"], vi: "Tôi rất ___ được gặp bạn.", hint: "/ˈhæpi/" },
        { q: "Where ___ you live?", a: "do", wrong: ["does", "is", "are"], vi: "Bạn sống ở đâu? (trợ động từ)", hint: "/duː/" },
        { q: "She ___ a student.", a: "is", wrong: ["are", "am", "be"], vi: "Cô ấy ___ học sinh.", hint: "/ɪz/" },
        { q: "This is ___ book.", a: "my", wrong: ["me", "I", "mine"], vi: "Đây là sách ___.", hint: "/maɪ/" },
        { q: "They ___ playing outside.", a: "are", wrong: ["is", "am", "be"], vi: "Họ ___ đang chơi ngoài.", hint: "/ɑː/" },
        { q: "I have ___ apple.", a: "an", wrong: ["a", "the", "some"], vi: "Tôi có ___ quả táo.", hint: "/æn/" },
        { q: "He ___ to school by bus.", a: "goes", wrong: ["go", "going", "gone"], vi: "Anh ấy ___ đến trường bằng xe buýt.", hint: "/ɡəʊz/" },
        { q: "Thank you ___ much.", a: "very", wrong: ["many", "so", "too"], vi: "Cảm ơn bạn ___ nhiều.", hint: "/ˈveri/" },
      ],
    },
    {
      id: "f6", title: "Màn 6 — Family & home", reward: 65,
      questions: [
        { q: "My mother's mother is my ___.", a: "grandmother", wrong: ["aunt", "sister", "cousin"], vi: "Mẹ của mẹ tôi là ___.", hint: "/ˈɡrænmʌðə/" },
        { q: "I sleep in my ___.", a: "bedroom", wrong: ["kitchen", "garden", "garage"], vi: "Tôi ngủ trong ___.", hint: "/ˈbedruːm/" },
        { q: "We cook food in the ___.", a: "kitchen", wrong: ["bathroom", "bedroom", "attic"], vi: "Chúng tôi nấu ăn trong ___.", hint: "/ˈkɪtʃɪn/" },
        { q: "My father is my mom's ___.", a: "husband", wrong: ["brother", "uncle", "son"], vi: "Bố tôi là ___ của mẹ.", hint: "/ˈhʌzbənd/" },
        { q: "A young boy in the family is a ___.", a: "son", wrong: ["daughter", "uncle", "niece"], vi: "Con trai trong gia đình gọi là ___.", hint: "/sʌn/" },
        { q: "We watch TV in the ___.", a: "living", wrong: ["washing", "parking", "waiting"], vi: "Chúng tôi xem TV ở phòng ___ (living room).", hint: "/ˈlɪvɪŋ/" },
        { q: "Please wash your hands in the ___.", a: "bathroom", wrong: ["bedroom", "garage", "balcony"], vi: "Hãy rửa tay trong ___.", hint: "/ˈbɑːθruːm/" },
        { q: "My uncle's child is my ___.", a: "cousin", wrong: ["nephew", "niece", "brother"], vi: "Con của chú/bác là ___.", hint: "/ˈkʌzn/" },
        { q: "We enter the house through the ___.", a: "door", wrong: ["window", "roof", "floor"], vi: "Chúng ta vào nhà qua ___.", hint: "/dɔː/" },
        { q: "At night the house needs a ___.", a: "light", wrong: ["cloud", "stone", "leaf"], vi: "Ban đêm nhà cần ___.", hint: "/laɪt/" },
      ],
    },
    {
      id: "f7", title: "Màn 7 — Weather & travel", reward: 70,
      questions: [
        { q: "Take an umbrella. It is ___.", a: "raining", wrong: ["sunny", "windy", "snowing"], vi: "Cầm ô đi. Trời đang ___.", hint: "/ˈreɪnɪŋ/" },
        { q: "The ___ is shining today.", a: "sun", wrong: ["moon", "rain", "fog"], vi: "___ đang chiếu sáng hôm nay.", hint: "/sʌn/" },
        { q: "I go to work by ___.", a: "bus", wrong: ["bed", "book", "box"], vi: "Tôi đi làm bằng ___.", hint: "/bʌs/" },
        { q: "Planes ___ in the sky.", a: "fly", wrong: ["swim", "drive", "crawl"], vi: "Máy bay ___ trên trời.", hint: "/flaɪ/" },
        { q: "A place to wait for a train is a ___.", a: "station", wrong: ["kitchen", "garden", "closet"], vi: "Nơi chờ tàu là ___.", hint: "/ˈsteɪʃn/" },
        { q: "Wear a coat. It is very ___.", a: "cold", wrong: ["hot", "warm", "mild"], vi: "Mặc áo khoác. Trời rất ___.", hint: "/kəʊld/" },
        { q: "We ___ our bags before the trip.", a: "pack", wrong: ["paint", "plant", "push"], vi: "Chúng tôi ___ hành lý trước chuyến đi.", hint: "/pæk/" },
        { q: "The map helps us find the ___.", a: "way", wrong: ["why", "who", "when"], vi: "Bản đồ giúp tìm ___.", hint: "/weɪ/" },
        { q: "A ticket is needed to ___ the train.", a: "ride", wrong: ["write", "read", "rest"], vi: "Cần vé để ___ tàu.", hint: "/raɪd/" },
        { q: "See you ___! (when leaving)", a: "later", wrong: ["early", "never", "yesterday"], vi: "Gặp lại ___! (tạm biệt)", hint: "/ˈleɪtə/" },
      ],
    },
  ];

  const VOCAB_STAGES = [
    { id: "v1", title: "Màn 1 — Short words", reward: 40, words: [
      { w: "CAT", vi: "con mèo", ipa: "/kæt/" }, { w: "DOG", vi: "con chó", ipa: "/dɒɡ/" },
      { w: "SUN", vi: "mặt trời", ipa: "/sʌn/" }, { w: "BED", vi: "giường", ipa: "/bed/" },
      { w: "HAT", vi: "mũ", ipa: "/hæt/" }, { w: "CUP", vi: "cốc", ipa: "/kʌp/" },
      { w: "PEN", vi: "bút", ipa: "/pen/" }, { w: "BUS", vi: "xe buýt", ipa: "/bʌs/" },
      { w: "MAP", vi: "bản đồ", ipa: "/mæp/" }, { w: "KEY", vi: "chìa khóa", ipa: "/kiː/" },
    ]},
    { id: "v2", title: "Màn 2 — Farm words", reward: 45, words: [
      { w: "FARM", vi: "nông trại", ipa: "/fɑːm/" }, { w: "SEED", vi: "hạt giống", ipa: "/siːd/" },
      { w: "CORN", vi: "ngô", ipa: "/kɔːn/" }, { w: "TREE", vi: "cây", ipa: "/triː/" },
      { w: "SOIL", vi: "đất", ipa: "/sɔɪl/" }, { w: "RAIN", vi: "mưa", ipa: "/reɪn/" },
      { w: "GOAT", vi: "dê", ipa: "/ɡəʊt/" }, { w: "HEN", vi: "gà mái", ipa: "/hen/" },
      { w: "BARN", vi: "nhà kho", ipa: "/bɑːn/" }, { w: "HAY", vi: "cỏ khô", ipa: "/heɪ/" },
    ]},
    { id: "v3", title: "Màn 3 — Food", reward: 50, words: [
      { w: "RICE", vi: "gạo/cơm", ipa: "/raɪs/" }, { w: "MILK", vi: "sữa", ipa: "/mɪlk/" },
      { w: "CAKE", vi: "bánh ngọt", ipa: "/keɪk/" }, { w: "SOUP", vi: "súp", ipa: "/suːp/" },
      { w: "FISH", vi: "cá", ipa: "/fɪʃ/" }, { w: "MEAT", vi: "thịt", ipa: "/miːt/" },
      { w: "BREAD", vi: "bánh mì", ipa: "/bred/" }, { w: "APPLE", vi: "táo", ipa: "/ˈæpl/" },
      { w: "GRAPE", vi: "nho", ipa: "/ɡreɪp/" }, { w: "LEMON", vi: "chanh", ipa: "/ˈlemən/" },
    ]},
    { id: "v4", title: "Màn 4 — School words", reward: 55, words: [
      { w: "BOOK", vi: "sách", ipa: "/bʊk/" }, { w: "DESK", vi: "bàn học", ipa: "/desk/" },
      { w: "CLASS", vi: "lớp học", ipa: "/klɑːs/" }, { w: "PENCIL", vi: "bút chì", ipa: "/ˈpensl/" },
      { w: "PAPER", vi: "giấy", ipa: "/ˈpeɪpə/" }, { w: "RULER", vi: "thước kẻ", ipa: "/ˈruːlə/" },
      { w: "BOARD", vi: "bảng", ipa: "/bɔːd/" }, { w: "STUDY", vi: "học bài", ipa: "/ˈstʌdi/" },
      { w: "WRITE", vi: "viết", ipa: "/raɪt/" }, { w: "READ", vi: "đọc", ipa: "/riːd/" },
    ]},
    { id: "v5", title: "Màn 5 — Action verbs", reward: 60, words: [
      { w: "JUMP", vi: "nhảy", ipa: "/dʒʌmp/" }, { w: "WALK", vi: "đi bộ", ipa: "/wɔːk/" },
      { w: "RUN", vi: "chạy", ipa: "/rʌn/" }, { w: "COOK", vi: "nấu ăn", ipa: "/kʊk/" },
      { w: "WASH", vi: "rửa", ipa: "/wɒʃ/" }, { w: "OPEN", vi: "mở", ipa: "/ˈəʊpən/" },
      { w: "CLOSE", vi: "đóng", ipa: "/kləʊz/" }, { w: "HELP", vi: "giúp đỡ", ipa: "/help/" },
      { w: "LEARN", vi: "học", ipa: "/lɜːn/" }, { w: "SHOOT", vi: "bắn", ipa: "/ʃuːt/" },
    ]},
    { id: "v6", title: "Màn 6 — Nature", reward: 65, words: [
      { w: "RIVER", vi: "sông", ipa: "/ˈrɪvə/" }, { w: "CLOUD", vi: "đám mây", ipa: "/klaʊd/" },
      { w: "STONE", vi: "viên đá", ipa: "/stəʊn/" }, { w: "LEAF", vi: "lá cây", ipa: "/liːf/" },
      { w: "WIND", vi: "gió", ipa: "/wɪnd/" }, { w: "LAKE", vi: "hồ", ipa: "/leɪk/" },
      { w: "HILL", vi: "đồi", ipa: "/hɪl/" }, { w: "BIRD", vi: "chim", ipa: "/bɜːd/" },
      { w: "FROG", vi: "ếch", ipa: "/frɒɡ/" }, { w: "BEE", vi: "ong", ipa: "/biː/" },
    ]},
    { id: "v7", title: "Màn 7 — Feelings", reward: 70, words: [
      { w: "HAPPY", vi: "vui vẻ", ipa: "/ˈhæpi/" }, { w: "TIRED", vi: "mệt", ipa: "/ˈtaɪəd/" },
      { w: "BRAVE", vi: "dũng cảm", ipa: "/breɪv/" }, { w: "KIND", vi: "tử tế", ipa: "/kaɪnd/" },
      { w: "PROUD", vi: "tự hào", ipa: "/praʊd/" }, { w: "CALM", vi: "bình tĩnh", ipa: "/kɑːm/" },
      { w: "ANGRY", vi: "tức giận", ipa: "/ˈæŋɡri/" }, { w: "SCARED", vi: "sợ hãi", ipa: "/skeəd/" },
      { w: "FUNNY", vi: "buồn cười", ipa: "/ˈfʌni/" }, { w: "SMART", vi: "thông minh", ipa: "/smɑːt/" },
    ]},
  ];

  const BOSS_DEFS = [
    {
      id: "b1", name: "Word Worm", unlockNeed: 6, hp: 5, playerHp: 3, mode: "fill_burst",
      rewardCrop: "corn", rewardSeeds: 3,
      questions: [
        { q: "The opposite of hot is ___.", a: "cold", wrong: ["warm", "cool", "heat"], vi: "Trái nghĩa của nóng là ___.", hint: "/kəʊld/" },
        { q: "A baby cat is a ___.", a: "kitten", wrong: ["puppy", "cub", "calf"], vi: "Mèo con gọi là ___.", hint: "/ˈkɪtn/" },
        { q: "We sleep at ___.", a: "night", wrong: ["noon", "morning", "dawn"], vi: "Chúng ta ngủ vào ___.", hint: "/naɪt/" },
        { q: "Bread is made from ___.", a: "flour", wrong: ["flower", "sugar", "salt"], vi: "Bánh mì làm từ ___.", hint: "/ˈflaʊə/" },
        { q: "The ___ shines at night.", a: "moon", wrong: ["sun", "star", "cloud"], vi: "___ sáng vào ban đêm.", hint: "/muːn/" },
      ],
    },
    {
      id: "b2", name: "Grammar Golem", unlockNeed: "b1", hp: 8, playerHp: 3, mode: "shield_fill",
      rewardCrops: ["tomato", "sunflower"], rewardSeeds: 2,
      questions: [
        { q: "She ___ to school every day.", a: "goes", wrong: ["go", "going", "gone"], vi: "Cô ấy ___ đến trường mỗi ngày.", hint: "Ngôi 3 số ít" },
        { q: "There ___ two apples.", a: "are", wrong: ["is", "am", "be"], vi: "Có hai quả táo — dùng ___.", hint: "số nhiều" },
        { q: "I have ___ umbrella.", a: "an", wrong: ["a", "the", "some"], vi: "Tôi có ___ chiếc ô.", hint: "nguyên âm" },
        { q: "He is ___ than me.", a: "taller", wrong: ["tall", "tallest", "more tall"], vi: "Anh ấy ___ hơn tôi.", hint: "so sánh hơn" },
        { q: "They ___ playing now.", a: "are", wrong: ["is", "am", "be"], vi: "Họ ___ đang chơi.", hint: "hiện tại tiếp diễn" },
        { q: "Don't ___ late!", a: "be", wrong: ["is", "are", "am"], vi: "Đừng ___ muộn!", hint: "câu mệnh lệnh" },
        { q: "This book is ___.", a: "mine", wrong: ["my", "me", "I"], vi: "Cuốn sách này là ___.", hint: "đại từ sở hữu" },
        { q: "We ___ finished yet.", a: "haven't", wrong: ["hasn't", "didn't", "isn't"], vi: "Chúng tôi chưa xong — ___.", hint: "hiện tại hoàn thành" },
      ],
    },
    {
      id: "b3", name: "Lexicon Dragon", unlockNeed: "b2", hp: 6, playerHp: 4, mode: "vocab_rush",
      rewardCrop: "crystal", rewardSeeds: 2,
      words: [
        { w: "HARVEST", vi: "thu hoạch", ipa: "/ˈhɑːvɪst/" },
        { w: "GARDEN", vi: "khu vườn", ipa: "/ˈɡɑːdn/" },
        { w: "ENGLISH", vi: "tiếng Anh", ipa: "/ˈɪŋɡlɪʃ/" },
        { w: "VICTORY", vi: "chiến thắng", ipa: "/ˈvɪktəri/" },
        { w: "DRAGON", vi: "rồng", ipa: "/ˈdræɡən/" },
        { w: "CRYSTAL", vi: "pha lê", ipa: "/ˈkrɪstl/" },
      ],
    },
  ];

  const SEASONS = [
    { id: "spring", name: "Xuân", color: "#7ecf6a", sky: 0x9fd4ff, ground: 0x5a9e4a, plot: 0x6b4423, hemi: 0xe8ffe8, sun: 0xfff2d0, sunIntensity: 1.15, growMul: 1.1, payoutMul: 1, vipMul: 1, fog: 0x9fd4ff, fogNear: 22, fogFar: 58, particle: "petal", ambientGain: 0.35 },
    { id: "summer", name: "Hạ", color: "#ffe566", sky: 0x5eb0ff, ground: 0x6bb34a, plot: 0x7a5030, hemi: 0xfff8e0, sun: 0xffe8a0, sunIntensity: 1.35, growMul: 1, payoutMul: 1.1, vipMul: 1, fog: 0x5eb0ff, fogNear: 28, fogFar: 65, particle: "dust", ambientGain: 0.4 },
    { id: "autumn", name: "Thu", color: "#ff9a3c", sky: 0xffc98a, ground: 0x8a7a3a, plot: 0x5c3a1e, hemi: 0xffe0c0, sun: 0xffc080, sunIntensity: 1.0, growMul: 1, payoutMul: 1, vipMul: 1.15, fog: 0xffc98a, fogNear: 18, fogFar: 50, particle: "leaf", ambientGain: 0.3 },
    { id: "winter", name: "Đông", color: "#c8e0ff", sky: 0xc8d8ea, ground: 0xc0d0c8, plot: 0x4a3a2a, hemi: 0xe8f0ff, sun: 0xe8f0ff, sunIntensity: 0.75, growMul: 0.75, payoutMul: 1.05, vipMul: 1, fog: 0xc8d8ea, fogNear: 14, fogFar: 45, particle: "snow", ambientGain: 0.25 },
    { id: "rain", name: "Mùa mưa", color: "#5a8aaa", sky: 0x5a7088, ground: 0x3a6a3a, plot: 0x3d2817, hemi: 0xa0b0c0, sun: 0xb0c0d0, sunIntensity: 0.55, growMul: 1.05, payoutMul: 1, vipMul: 1, fog: 0x5a7088, fogNear: 10, fogFar: 40, particle: "rain", ambientGain: 0.45 },
    { id: "festival", name: "Lễ hội", color: "#ff6ad5", sky: 0x2a1a4a, ground: 0x4a6a3a, plot: 0x5c3a2e, hemi: 0xffd0f0, sun: 0xffa0e0, sunIntensity: 0.9, growMul: 1, payoutMul: 1, vipMul: 1, fog: 0x3a2a5a, fogNear: 16, fogFar: 48, particle: "spark", seedBonusChance: 0.35, ambientGain: 0.5 },
  ];

  const CROPS = {
    fast: { id: "fast", name: "Pepper", label: "Ớt", growMs: 4000, coins: 8, vip: false, shop: 15, pack: 3, color: 0xe74c3c },
    slow: { id: "slow", name: "Pumpkin", label: "Bí ngô", growMs: 8000, coins: 20, vip: false, shop: 25, pack: 2, color: 0xe67e22 },
    carrot: { id: "carrot", name: "Carrot", label: "Cà rốt", growMs: 5000, coins: 12, vip: false, shop: 18, pack: 3, color: 0xe67e22 },
    wheat: { id: "wheat", name: "Wheat", label: "Lúa", growMs: 6500, coins: 14, vip: false, shop: 20, pack: 4, color: 0xf4d03f },
    berry: { id: "berry", name: "Berry", label: "Dâu", growMs: 4500, coins: 11, vip: false, shop: 16, pack: 3, color: 0xc0392b },
    cabbage: { id: "cabbage", name: "Cabbage", label: "Bắp cải", growMs: 7000, coins: 16, vip: false, shop: 22, pack: 2, color: 0x58d68d },
    melon: { id: "melon", name: "Melon", label: "Dưa", growMs: 9000, coins: 28, vip: false, shop: 32, pack: 2, color: 0x27ae60 },
    corn: { id: "corn", name: "Corn VIP", label: "Ngô ★", growMs: 6000, coins: 35, vip: true, shop: 40, pack: 1, color: 0xf1c40f },
    tomato: { id: "tomato", name: "Tomato VIP", label: "Cà ★", growMs: 5500, coins: 40, vip: true, shop: 45, pack: 1, color: 0xe74c3c },
    sunflower: { id: "sunflower", name: "Sunflower VIP", label: "Hướng dương ★", growMs: 7000, coins: 45, vip: true, shop: 50, pack: 1, color: 0xf39c12 },
    grape: { id: "grape", name: "Grape VIP", label: "Nho ★", growMs: 6500, coins: 50, vip: true, shop: 55, pack: 1, color: 0x8e44ad },
    moon: { id: "moon", name: "Moonbloom VIP", label: "Hoa trăng ★", growMs: 8000, coins: 70, vip: true, shop: 75, pack: 1, color: 0x85c1e9 },
    crystal: { id: "crystal", name: "Crystalberry", label: "Pha lê ★", growMs: 9000, coins: 80, vip: true, shop: 0, pack: 1, color: 0x9b59ff },
  };

  global.HS_CONTENT = {
    FILL_STAGES, VOCAB_STAGES, BOSS_DEFS, SEASONS, CROPS,
    NORMAL_CROPS: ["fast", "slow", "carrot", "wheat", "berry", "cabbage", "melon"],
    VIP_CROPS: ["corn", "tomato", "sunflower", "grape", "moon", "crystal"],
    VIP_COLS: 2, VIP_ROWS: 3, VIP_SPACING: 2.2,
    VIP_ORIGIN: { x: 7.2, y: 0, z: -6.2 },
    COLS: 3, SPACING: 2.4, MAX_ROWS: 5, SAVE_KEY: "harvestShot_save_v3",
  };
})(typeof window !== "undefined" ? window : globalThis);
