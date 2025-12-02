import GameClient, { getRandomItem } from "./main"
import Render, { PositionType, SquareID } from "./Render"

export type SquareData = 0 | 1 | 2 // none | normal | golden

export type OriginalPiece = {
  sqList: sqDirs[]
  goldenSqIndex: number | "CENTER" // index of square
}

type ClearableSquare = { id: SquareID, prevState: SquareData }

type CurrentPiece = {
  op: OriginalPiece
  sqList: sqDirs[] // transformed sqList, apply rotation here
  hoveredSq: SquareID | null
}

export type sqDirs = ("U" | "D" | "L" | "R")[] // for one square in a piece

export default class Gameplay {
  gc: GameClient
  render!: Render

  RAW_PIECES: sqDirs[][] = [
    // not include center square
    [["R"], ["U"], ["U", "U"]], // L
    [["L"], ["U"], ["U", "U"]], // J
    [["U"], ["R"], ["R", "D"]], // S
    [["U"], ["L"], ["L", "D"]], // Z
    [["U"], ["R"], ["D"]], // T
    [["D"], ["U"], ["U", "U"]], // I

    /*
    [[0, 0], [1, 0], [0, 1], [0, 2]], // L
    [[0, 0], [1, 0], [1, 1], [1, 2]], // J
    [[1, 0], [1, 1], [0, 1], [0, 2]], // S (first item is not [0,0])
    [[0, 0], [0, 1], [1, 1], [1, 2]], // Z
    [[0, 0], [0, 1], [0, 2], [1, 1]], // T
    [[0, 0], [0, 1], [0, 2], [0, -1]] // I
    */

  ]

  boardData: SquareData[][][] = [] // face > row > square

  currentPiece: CurrentPiece | null = null
  nextPieces: [OriginalPiece | null, OriginalPiece | null] = [null, null]

  remainingPieces: number = 40
  goldPoints: number = 0

  lastHoveredFaceIndex: 0 | 1 | 2 = 1 // second face is default




  constructor(gameClient: GameClient) {
    this.gc = gameClient

    this.setUpNewGame()
  }

  getNewPiece(): OriginalPiece {
    return {
      sqList: getRandomItem(this.RAW_PIECES),
      goldenSqIndex: getRandomItem([0, 1, 2, "CENTER"])
    }
  }

  setUpNewGame() {
    // reset
    this.remainingPieces = 30
    this.goldPoints = 0
    this.currentPiece = null

    // set starting nextPieces
    this.nextPieces = [this.getNewPiece(), this.getNewPiece()]
    this.shiftPiecesInventory() // set currentPiece

    // empty board data
    this.boardData = Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () =>
        Array.from({ length: 3 }, () => 0)
      )
    );

  }


  // called after modifying remainingPieces
  shiftPiecesInventory() {
    this.lastHoveredFaceIndex = 1 // reset

    // set currentPiece to the next one
    const nextPiece = this.nextPieces[0]
    if (nextPiece === null) {
      this.currentPiece = null // out of pieces
    } else {
      this.currentPiece = {
        op: nextPiece,
        sqList: nextPiece.sqList.map(item => item.slice()),
        hoveredSq: null
      }
    }

    // shift and create new 2nd piece in nextPieces
    const { nextPieces, remainingPieces } = this
    nextPieces[0] = nextPieces[1]
    nextPieces[1] = remainingPieces > 2 ? this.getNewPiece() : null
  }

  getRotatedDir(d: sqDirs[number], clockwise: boolean): sqDirs[number] {
    const DIRS: sqDirs[number][] = ["U", "R", "D", "L"]
    if (clockwise) {
      let i = DIRS.indexOf(d) + 1
      if (i > 3) { i = 0 }
      return DIRS[i]
    } else {
      let i = DIRS.indexOf(d) - 1
      if (i < 0) { i = 3 }
      return DIRS[i]
    }
  }

  rotatePiece(clockwise: boolean) {
    const { currentPiece } = this
    if (!currentPiece) return
    currentPiece.sqList = currentPiece.sqList.map(
      sq => sq.map(d => this.getRotatedDir(d, clockwise))
    )
  }

  getAdjacentSqIDs(sid: SquareID): SquareID[] {
    const asids: SquareID[] = []
    // top
    if (sid[1] < 2) { asids.push([sid[0], sid[1] + 1, sid[2]]) }
    // right
    if (sid[2] < 2) { asids.push([sid[0], sid[1], sid[2] + 1]) }
    // down
    if (sid[1] > 0) { asids.push([sid[0], sid[1] - 1, sid[2]]) }
    else { asids.push([sid[0] === 2 ? 0 : sid[0] + 1, sid[2], 0]) }
    // left
    if (sid[2] > 0) { asids.push([sid[0], sid[1], sid[2] - 1]) }
    else { asids.push([sid[0] === 0 ? 2 : sid[0] - 1, 0, sid[1]]) }

    return asids
  }

  // clear and return list of cleared squares, empty array if no clearing
  clearFilledRows(): ClearableSquare[] {
    const sqs: ClearableSquare[] = []
    const bd = this.boardData

    // each face: check horizontal
    for (let i = 0; i < 3; i++) {
      const ni = i === 2 ? 0 : i + 1

      for (let r = 0; r < 3; r++) {
        const sids: SquareID[] = [
          [i, 2, r], [i, 1, r], [i, 0, r],
          [ni, r, 0], [ni, r, 1], [ni, r, 2],
        ]
        // check isClearable
        let isClearable = true
        for (let s = 0; s < sids.length; s++) {
          const sid = sids[s]
          if (bd[sid[0]][sid[1]][sid[2]] === 0) {
            isClearable = false
            break
          }
        }
        if (isClearable) {
          // add to list
          for (let s = 0; s < sids.length; s++) {
            const sid = sids[s]
            const sqData = bd[sid[0]][sid[1]][sid[2]]
            sqs.push({ id: sid, prevState: sqData })
          }
        }
      }
    }

    // apply clearing
    for (let i = 0; i < sqs.length; i++) {
      const sid = sqs[i].id;
      this.boardData[sid[0]][sid[1]][sid[2]] = 0
    }

    return sqs
  }

  placePiece() {
    const { hoveredSquare, calculatedSqs } = this.render.input
    const bd = this.boardData
    if (hoveredSquare === null) return

    // exit if not possible
    if (calculatedSqs.some(sq => sq.isOverlapped || sq.isOutOfBound)) { return }

    // reset
    this.render.input.hoveredSquare = null
    this.remainingPieces--

    // apply placement
    for (let i = 0; i < calculatedSqs.length; i++) {
      const sq = calculatedSqs[i]
      bd[sq.id[0]][sq.id[1]][sq.id[2]] = sq.isGolden ? 2 : 1
    }

    // apply spread from new golden square to its adjs
    for (let i = 0; i < calculatedSqs.length; i++) {
      const sq = calculatedSqs[i]
      if (!sq.isGolden) continue

      const asids = this.getAdjacentSqIDs(sq.id)
      for (let ai = 0; ai < asids.length; ai++) {
        const asid = asids[ai]
        if (bd[asid[0]][asid[1]][asid[2]] === 1) {
          bd[asid[0]][asid[1]][asid[2]] = 2
        }
      }
    }

    this.shiftPiecesInventory() // shift and create next piece

    //// should create dummies here to mask the real data
    //// test immediate clearing & immediate scoring
    const clearedSqs = this.clearFilledRows()
    this.goldPoints += clearedSqs.filter(s => s.prevState === 2).length
  }

}