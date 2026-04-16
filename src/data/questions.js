export const questions = [
  // EASY
  {
    question: "Berapa hasil dari 5 + 5?",
    options: ["8", "9", "10", "11"],
    correctAnswer: "10",
    difficulty: "EASY"
  },
  {
    question: "Apa warna dari langit yang cerah?",
    options: ["Biru", "Merah", "Hijau", "Kuning"],
    correctAnswer: "Biru",
    difficulty: "EASY"
  },
  {
    question: "Hewan apa yang dikenal sebagai Raja Hutan?",
    options: ["Gajah", "Singa", "Harimau", "Zebra"],
    correctAnswer: "Singa",
    difficulty: "EASY"
  },
  
  // NORMAL
  {
    question: "Ibukota negara Indonesia adalah?",
    options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
    correctAnswer: "Jakarta",
    difficulty: "NORMAL"
  },
  {
    question: "Planet terdekat dari Matahari adalah?",
    options: ["Venus", "Mars", "Merkurius", "Jupiter"],
    correctAnswer: "Merkurius",
    difficulty: "NORMAL"
  },
  {
    question: "Apa singkatan dari NKRI?",
    options: ["Negara Kesatuan Republik Indonesia", "Negara Kita Republik Indonesia", "Negara Kedaulatan Republik Indonesia", "Negara Kebangsaan Republik Indonesia"],
    correctAnswer: "Negara Kesatuan Republik Indonesia",
    difficulty: "NORMAL"
  },
  {
    question: "Siapa presiden pertama Indonesia?",
    options: ["Soeharto", "B.J. Habibie", "Soekarno", "Abdurrahman Wahid"],
    correctAnswer: "Soekarno",
    difficulty: "NORMAL"
  },

  // HARD
  {
    question: "Siapa penemu lampu pijar?",
    options: ["Isaac Newton", "Albert Einstein", "Thomas Alva Edison", "Nikola Tesla"],
    correctAnswer: "Thomas Alva Edison",
    difficulty: "HARD"
  },
  {
    question: "Berapakah jumlah provinsi di Indonesia saat ini (2024)?",
    options: ["34", "36", "38", "40"],
    correctAnswer: "38",
    difficulty: "HARD"
  },
  {
    question: "Unsur kimia dengan lambang 'Au' adalah?",
    options: ["Perak", "Emas", "Aluminium", "Tembaga"],
    correctAnswer: "Emas",
    difficulty: "HARD"
  }
];

export class QuestionManager {
  constructor() {
    this.questions = questions;
    this.lastQuestionIndex = -1;
  }

  getRandomQuestion(difficulty = 'NORMAL') {
    const filtered = this.questions.filter(q => q.difficulty === difficulty.toUpperCase());
    
    if (filtered.length === 0) {
      return this.questions[Math.floor(Math.random() * this.questions.length)];
    }

    // Try to pick a different one than the last time
    let index;
    let attempts = 0;
    do {
      index = Math.floor(Math.random() * filtered.length);
      attempts++;
    } while (index === this.lastQuestionIndex && filtered.length > 1 && attempts < 10);

    this.lastQuestionIndex = index;
    return filtered[index];
  }
}
