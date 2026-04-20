export const quizBank = {
    "Language": [
        { question: "Susun kata ini menjadi kalimat benar: 'is - He - reading'", options: ["He is reading", "Reading is he", "He reading is", "Is he reading"], correctAnswer: "He is reading", difficulty: "EASY" },
        { question: "Apa arti dari kata 'Apple'?", options: ["Jeruk", "Apel", "Mangga", "Pisang"], correctAnswer: "Apel", difficulty: "EASY" },
        { question: "Which one is a verb?", options: ["Car", "Run", "Blue", "Slowly"], correctAnswer: "Run", difficulty: "NORMAL" },
        { question: "Past tense of 'Go' is?", options: ["Gone", "Going", "Went", "Goes"], correctAnswer: "Went", difficulty: "NORMAL" },
        { question: "What is the synonym of 'Happy'?", options: ["Sad", "Angry", "Joyful", "Tired"], correctAnswer: "Joyful", difficulty: "HARD" },
        { question: "Choose the correct spelling:", options: ["Enviroment", "Environment", "Environemnt", "Evironment"], correctAnswer: "Environment", difficulty: "HARD" }
    ],
    "History": [
        { question: "Kapan Perang Dunia I dimulai?", options: ["1912", "1914", "1918", "1939"], correctAnswer: "1914", difficulty: "EASY" },
        { question: "Siapa presiden pertama Indonesia?", options: ["Soeharto", "B.J. Habibie", "Soekarno", "Gusdur"], correctAnswer: "Soekarno", difficulty: "EASY" },
        { question: "Negara mana yang menjajah Indonesia terlama?", options: ["Jepang", "Inggris", "Belanda", "Portugis"], correctAnswer: "Belanda", difficulty: "NORMAL" },
        { question: "Dimana letak Candi Borobudur?", options: ["Jawa Timur", "Jawa Tengah", "Bali", "Sumatera"], correctAnswer: "Jawa Tengah", difficulty: "NORMAL" },
        { question: "Perjanjian apa yang menandai berakhirnya PD 1?", options: ["Perjanjian Versailles", "Perjanjian Renville", "Perjanjian Linggarjati", "Perjanjian Roem-Royen"], correctAnswer: "Perjanjian Versailles", difficulty: "HARD" }
    ],
    "Mathematics": [
        { question: "Berapa hasil dari 5 + 5?", options: ["8", "9", "10", "11"], correctAnswer: "10", difficulty: "EASY" },
        { question: "Berapa 12 + 6?", options: ["16", "17", "18", "19"], correctAnswer: "18", difficulty: "EASY" },
        { question: "Berapa 50 / 5?", options: ["5", "10", "15", "20"], correctAnswer: "10", difficulty: "NORMAL" },
        { question: "Berapa 7 x 8?", options: ["54", "56", "64", "48"], correctAnswer: "56", difficulty: "NORMAL" },
        { question: "Berapa akar dari 144?", options: ["10", "12", "14", "16"], correctAnswer: "12", difficulty: "HARD" }
    ],
    "Science": [
        { question: "Apa warna dari langit yang cerah?", options: ["Biru", "Merah", "Hijau", "Kuning"], correctAnswer: "Biru", difficulty: "EASY" },
        { question: "Hewan apa yang bernapas dengan insang?", options: ["Katak", "Ikan", "Burung", "Ular"], correctAnswer: "Ikan", difficulty: "EASY" },
        { question: "Planet terdekat dari Matahari adalah?", options: ["Venus", "Mars", "Merkurius", "Jupiter"], correctAnswer: "Merkurius", difficulty: "NORMAL" },
        { question: "Proses perubahan ulat menjadi kupu-kupu disebut?", options: ["Fotosintesis", "Metamorfosis", "Evolusi", "Respirasi"], correctAnswer: "Metamorfosis", difficulty: "NORMAL" },
        { question: "Unsur kimia dengan lambang 'Au' adalah?", options: ["Perak", "Emas", "Aluminium", "Tembaga"], correctAnswer: "Emas", difficulty: "HARD" }
    ],
    "Technology": [
        { question: "Apa kepanjangan dari CPU?", options: ["Central Process Unit", "Central Processing Unit", "Computer Personal Unit", "Control Processing Unit"], correctAnswer: "Central Processing Unit", difficulty: "EASY" },
        { question: "Software untuk menjelajahi internet disebut?", options: ["Sistem Operasi", "Browser", "Antivirus", "Hardware"], correctAnswer: "Browser", difficulty: "EASY" },
        { question: "Siapa penemu lampu pijar?", options: ["Isaac Newton", "Albert Einstein", "Thomas Alva Edison", "Nikola Tesla"], correctAnswer: "Thomas Alva Edison", difficulty: "NORMAL" },
        { question: "Data yang disimpan sementara berada di?", options: ["Hardisk", "RAM", "ROM", "Flashdisk"], correctAnswer: "RAM", difficulty: "NORMAL" },
        { question: "Bahasa pemrograman yang sering digunakan untuk interaktivitas web?", options: ["Python", "Java", "JavaScript", "C++"], correctAnswer: "JavaScript", difficulty: "HARD" }
    ]
};

export class QuestionManager {
  constructor(category = "Mathematics") {
    this.quizCategory = category;
    this.lastQuestionIndex = -1;
  }

  getRandomQuestion(difficulty = 'NORMAL') {
    const categoryQuestions = quizBank[this.quizCategory] || quizBank["Mathematics"];
    let filtered = categoryQuestions.filter(q => q.difficulty === difficulty.toUpperCase());
    
    if (filtered.length === 0) {
      filtered = categoryQuestions;
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
