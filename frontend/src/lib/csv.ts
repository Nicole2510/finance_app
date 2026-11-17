import Papa from 'papaparse'

export const MAX_FILE_MB = 5

// Reads a CSV file in the browser (it's never uploaded) into rows of text
// cells. PapaParse handles the tricky parts: commas inside quotes, quotes
// inside quotes, Windows and Mac line endings, and blank lines.
export function readCsv(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      reject(new Error(`That file is over ${MAX_FILE_MB} MB. Try exporting fewer months at a time.`))
      return
    }
    Papa.parse<string[]>(file, {
      skipEmptyLines: 'greedy', // also skips lines that are only commas
      complete: (result) => {
        // Rows with stray quotes etc. still come through, so only stop if
        // nothing usable was read
        if (result.data.length === 0) reject(new Error("That file doesn't have any rows."))
        else resolve(result.data.map((row) => row.map((cell) => cell.trim())))
      },
      error: (err) => reject(new Error(`Couldn't read that file: ${err.message}`)),
    })
  })
}
