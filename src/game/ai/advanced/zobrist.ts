// Zobrist hash for board state
class Zobrist {
  private size: number;
  private codes: number[][][];

  constructor(size = 15) {
    this.size = size;
    this.codes = [];

    // Initialize random codes for each position and piece type
    for (let i = 0; i < size; i++) {
      this.codes[i] = [];
      for (let j = 0; j < size; j++) {
        this.codes[i][j] = [];
        for (let k = 0; k < 3; k++) {
          // 0: empty, 1: black, 2: white (but we use -1 for white)
          this.codes[i][j][k] = Math.floor(Math.random() * 0x7fffffff);
        }
      }
    }
  }

  hash(board: number[][], role = 1): number {
    let h = 0;
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        const piece = board[i][j];
        if (piece !== 0) {
          const code = piece === 1 ? this.codes[i][j][1] : this.codes[i][j][2];
          h ^= code;
        }
      }
    }
    return h;
  }
}

export default Zobrist;
