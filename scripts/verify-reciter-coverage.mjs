// Spot-check EveryAyah verse-by-verse coverage before enabling a reciter.
// Usage: node scripts/verify-reciter-coverage.mjs [folder_name]

const BASE = "https://everyayah.com/data";

const SAMPLE_AYAHS = [
  "001001", "001007", "002001", "002255", "002286", "003001", "004001", "005001",
  "006001", "007001", "008001", "009001", "010001", "011001", "012001", "013001",
  "014001", "015001", "016001", "017001", "018001", "019001", "020001",
  "036001", "036083", "037001", "048001", "055001", "067001", "078001",
  "089001", "099001", "112001", "112004", "113001", "114001", "114006",
];

async function headOk(folder, ayahRef) {
  const url = `${BASE}/${folder}/${ayahRef}.mp3`;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function verifyFolder(folder) {
  let ok = 0;
  const failed = [];
  for (const ref of SAMPLE_AYAHS) {
    if (await headOk(folder, ref)) ok++;
    else failed.push(ref);
  }
  return { folder, ok, total: SAMPLE_AYAHS.length, failed };
}

async function main() {
  const target = process.argv[2];
  const folders = target
    ? [target]
    : [
        "Alafasy_128kbps",
        "Yasser_Ad-Dussary_128kbps",
        "Muhammad_Ayyoub_128kbps",
        "Hani_Rifai_192kbps",
        "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
      ];

  let exitCode = 0;
  for (const folder of folders) {
    const result = await verifyFolder(folder);
    const pct = Math.round((result.ok / result.total) * 100);
    const status = result.ok === result.total ? "PASS" : "FAIL";
    if (status === "FAIL") exitCode = 1;
    console.log(`${status} ${folder}: ${result.ok}/${result.total} (${pct}%)`);
    if (result.failed.length > 0 && result.failed.length <= 8) {
      console.log(`  missing: ${result.failed.join(", ")}`);
    }
  }
  process.exit(exitCode);
}

main();