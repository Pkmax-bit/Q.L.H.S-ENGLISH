const S = '/lesson-media/scenes'

function part1Audio(options) {
  return `Look at the picture. A. ${options[0]} B. ${options[1]} C. ${options[2]} D. ${options[3]}`
}

export const LISTENING_UNITS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 22, 23, 26, 27, 28, 29])
export const PHOTO_UNITS = new Set([2, 3, 22])

export const UNIT_ASSETS = {
  1: {
    sample: 'The TOEIC listening and reading test has two hundred questions. Listening has one hundred questions and lasts about forty-five minutes.',
    scenes: [{ url: `${S}/airport.svg`, caption: 'Nghe thông báo — ghi gate, giờ, việc cần làm' }],
  },
  2: {
    sample: 'Look at the picture. A man is reaching for a book on the shelf. Two people are talking in front of a laptop.',
    scenes: [],
    questions: {},
  },
  3: {
    sample: 'Look at the picture. The hotel room is empty. Cars are parked in the lot. Buildings stand next to the water.',
    scenes: [],
    questions: {},
  },
  4: {
    sample: 'Where is the conference room? On the third floor.',
    scenes: [{ url: `${S}/entrance.svg`, caption: 'Câu hỏi Where / When / Who' }],
    questions: {
      0: { audio: 'Where is the conference room?' },
      1: { audio: 'When does the shop open?' },
      2: { audio: 'Who will present the report?' },
      3: { audio: 'Why was the meeting canceled?' },
      4: { audio: 'How long is the break?' },
      5: { audio: 'Where is the conference room? Do not choose a time. Listen for the question word.' },
    },
  },
  5: {
    sample: 'Is the printer working? Not right now.',
    scenes: [{ url: `${S}/typing.svg`, caption: 'Câu Yes / No và lựa chọn' }],
    questions: {
      0: { audio: 'Is the printer working?' },
      1: { audio: 'Would you like tea or coffee?' },
      2: { audio: 'Can you send the invoice today?' },
      3: { audio: 'Have you met the new intern?' },
      4: { audio: 'Should we postpone the call?' },
      5: { audio: 'Can you send the invoice today? I’ll do it this afternoon.' },
    },
  },
  6: {
    sample: 'I can’t find the staples. They’re in the top drawer.',
    scenes: [{ url: `${S}/warehouse.svg`, caption: 'Statement — phản hồi tình huống' }],
    questions: {
      0: { audio: 'I can’t find the staples.' },
      1: { audio: 'The elevator is out of order.' },
      2: { audio: 'This report looks great.' },
      3: { audio: 'I left my badge at home.' },
      4: { audio: 'The deadline was moved up.' },
      5: { audio: 'The deadline was moved up. That means it is earlier than before.' },
    },
  },
  7: {
    sample: 'The printer on floor two is jammed. I’ll send a technician this afternoon.',
    scenes: [{ url: `${S}/pointing-screen.svg`, caption: 'Part 3 — nghe ý chính' }],
    questions: {
      0: { audio: 'Man: The printer on floor two is jammed. Woman: I’ll send a technician this afternoon.' },
      1: { audio: 'What is the purpose of the conversation?' },
      2: { audio: 'Woman: Our client will arrive late. Man: Then let’s move the meeting to three o’clock.' },
      3: { audio: 'I’m calling about the invoice dated May third.' },
      4: { audio: 'I’m calling about the invoice dated May third. Could you check the total?' },
      5: { audio: 'Listen for the reason they called, not a small number at the end.' },
    },
  },
  8: {
    sample: 'Please bring thirty copies to room four oh eight.',
    scenes: [{ url: `${S}/document.svg`, caption: 'Part 3 — nghe số, giờ, nơi' }],
    questions: {
      0: { audio: 'Please bring thirty copies to room four oh eight.' },
      1: { audio: 'The tour starts at nine fifteen in the lobby.' },
      2: { audio: 'What time does the tour start? How many copies do they need?' },
      3: { audio: 'Call me at five five five, zero one four two, before noon.' },
      4: { audio: 'Write down numbers as soon as you hear them.' },
      5: { audio: 'Twelve and twenty sound similar. Listen carefully for room numbers.' },
    },
  },
  9: {
    sample: 'I left my wallet in the taxi, and I need to pay for lunch.',
    scenes: [{ url: `${S}/entrance.svg`, caption: 'Part 3 — suy luận' }],
    questions: {
      0: { audio: 'I left my wallet in the taxi. I need to pay for lunch.' },
      1: { audio: 'The last train is at ten. It’s nine fifty. Let’s run.' },
      2: { audio: 'What will they probably do next?' },
      3: { audio: 'I wish I had printed more handouts.' },
      4: { audio: 'Do not invent information that was not in the conversation.' },
      5: { audio: 'Maybe we should ask Mark. He designed the form.' },
    },
  },
  10: {
    sample: 'Flight two oh eight to Osaka will board at gate B four in twenty minutes.',
    scenes: [{ url: `${S}/airport.svg`, caption: 'Part 4 — announcement' }],
    questions: {
      0: { audio: 'Flight two oh eight to Osaka will board at gate B four in twenty minutes.' },
      1: { audio: 'Due to weather, the five forty train is delayed by fifteen minutes.' },
      2: { audio: 'Please go to platform three. The train will leave in ten minutes.' },
      3: { audio: 'Please remain seated until the vehicle stops.' },
      4: { audio: 'The six P.M. train is cancelled. Cancelled means it will not run.' },
      5: { audio: 'Write the gate, the time, and the action you must take.' },
    },
  },
  11: {
    sample: 'Today I’ll cover three ways to reduce waste in the office. First, print less. Second, reuse paper. Third, sort recycling.',
    scenes: [{ url: `${S}/pointing-board.svg`, caption: 'Part 4 — talk / bài nói' }],
    questions: {
      0: { audio: 'Today I’ll cover three ways to reduce waste in the office.' },
      1: { audio: 'After lunch, please go to room two for the workshop.' },
      2: { audio: 'This is a short talk by one speaker, not a conversation.' },
      3: { audio: 'As you can see on this slide, accidents dropped last year.' },
      4: { audio: 'What is the talk mainly about?' },
      5: { audio: 'Read the questions before the talk begins.' },
    },
  },
  12: {
    sample: 'Hi, this is Dana from billing. Please call me back at extension four four zero. I need to confirm Friday’s appointment.',
    scenes: [{ url: `${S}/email.svg`, caption: 'Part 4 — voicemail / message' }],
    questions: {
      0: { audio: 'Hi, this is Dana from billing. Please call me back at extension four four zero.' },
      1: { audio: 'I need to change my appointment from Friday to Monday.' },
      2: { audio: 'If I’m not there, leave a message with the receptionist.' },
      3: { audio: 'Again, my name is Dana. I’m at extension four four zero. Thank you.' },
      4: { audio: 'This is urgent. Please return my call this morning.' },
      5: { audio: 'Write the caller’s name, the task, and the phone number.' },
    },
  },
  13: { scenes: [{ url: `${S}/email.svg`, caption: 'Đọc — word form trong câu' }] },
  14: { scenes: [{ url: `${S}/email.svg`, caption: 'Đọc — thì động từ' }] },
  15: { scenes: [{ url: `${S}/email.svg`, caption: 'Đọc — bị động / to-V' }] },
  16: { scenes: [{ url: `${S}/email.svg`, caption: 'Đọc — giới từ & liên từ' }] },
  17: { scenes: [{ url: `${S}/email.svg`, caption: 'Part 6 — đoạn văn có chỗ trống' }] },
  18: {
    scenes: [{ url: `${S}/email.svg`, caption: 'Part 7 — email / thư' }],
    questions: {},
  },
  19: {
    scenes: [{ url: `${S}/advert.svg`, caption: 'Part 7 — quảng cáo' }],
    questions: {},
  },
  20: { scenes: [{ url: `${S}/email.svg`, caption: 'Part 7 — hai đoạn' }] },
  21: { scenes: [{ url: `${S}/email.svg`, caption: 'Part 7 — ba đoạn' }] },
  22: {
    sample: 'Look at the picture. A man is checking under the hood of a car. Preview who is doing what, then listen.',
    scenes: [],
    questions: {
      0: { audio: part1Audio(['He is checking under the hood.', 'He is washing the windshield.', 'The car is being driven away.', 'Nobody is near the car.']) },
      1: { audio: 'Where is the meeting? Do not choose a time.' },
      2: { audio: 'Walking and working sound similar. Choose the word that matches the picture.' },
      3: { audio: 'I can’t log in.' },
      4: { audio: 'Parts one and two can give you easy listening points. Preview and listen for the question word.' },
      5: { audio: 'If you are not sure, eliminate answers of the wrong type, then guess.' },
    },
  },
  23: {
    sample: 'Man: The delivery is late again. Woman: I’ll call the supplier now. What is the purpose of the conversation?',
    scenes: [{ url: `${S}/pointing-board.svg`, caption: 'Ôn Part 3–4' }],
    questions: {
      0: { audio: 'This is a conversation between two coworkers about a late delivery.' },
      1: { audio: 'May I have your attention please. The workshop will begin in room two after lunch.' },
      2: { audio: 'Read the questions before the audio starts.' },
      3: { audio: 'Write only key words: who, what, numbers, and the next step.' },
      4: { audio: 'Look at the table, then listen. Some questions use a graphic and the talk together.' },
      5: { audio: 'When one set ends, move to the next set immediately.' },
    },
  },
  24: { scenes: [{ url: `${S}/email.svg`, caption: 'Ôn Reading Part 5–6' }] },
  25: { scenes: [{ url: `${S}/email.svg`, caption: 'Ôn Reading Part 7' }] },
  26: {
    sample: 'Listening lasts forty-five minutes and you cannot pause. Keep moving with the test.',
    scenes: [{ url: `${S}/airport.svg`, caption: 'Canh giờ Listening' }],
    questions: {
      0: { audio: 'You cannot rewind the listening test. Stay with the pace of the audio.' },
    },
  },
  27: {
    sample: 'What time is the interview? At two thirty. The delivery is late. I will call the supplier.',
    scenes: [],
    questions: {
      0: { audio: part1Audio(['They are talking in front of a laptop.', 'They are packing boxes.', 'They have left the room.', 'One person is sleeping.']) },
      1: { audio: 'What time is the interview?' },
      2: { audio: 'Man: The delivery still isn’t here. Woman: I’ll call the supplier right now.' },
    },
  },
  28: {
    sample: 'Please return my call at extension eighteen. The files are in the cabinet.',
    scenes: [{ url: `${S}/email.svg`, caption: 'Mini test 2 — nghe số + đọc' }],
    questions: {
      3: { audio: 'Hi, please call me back at extension eighteen.' },
    },
  },
  29: {
    sample: 'Listening needs prediction and notes. Speaking needs short, clear answers.',
    scenes: [
      { url: `${S}/typing.svg`, caption: 'Nghe + nói' },
      { url: `${S}/email.svg`, caption: 'Đọc + viết' },
    ],
    questions: {
      1: { audio: 'Preview the questions, write key words, then check the traps after you listen.' },
    },
  },
}

export function getUnitAssets(unitNo) {
  return UNIT_ASSETS[Number(unitNo)] || null
}

function isHomemadeImage(url) {
  return /\/lesson-media\//i.test(String(url || ''))
}

export function enrichQuestion(question, unitNo, index) {
  const extra = getUnitAssets(unitNo)?.questions?.[index] || {}
  const image = [question.image, extra.image].find((url) => url && !isHomemadeImage(url)) || ''
  let audio = question.audio || extra.audio || ''
  if (!audio && image && question.options?.length === 4 && /^[A-Za-z]/.test(question.options[0])) {
    audio = part1Audio(question.options)
  }
  return { ...question, image, audio, transcript: extra.transcript || audio }
}
