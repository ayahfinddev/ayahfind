"""
Download full Quran (Uthmani + English) from open APIs.
Sources: alquran.cloud (primary), quran-json fallback.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import httpx

SURAHS_META = [
    (1, "الفاتحة", "Al-Fatiha", "meccan", 7),
    (2, "البقرة", "Al-Baqarah", "medinan", 286),
    (3, "آل عمران", "Ali Imran", "medinan", 200),
    (4, "النساء", "An-Nisa", "medinan", 176),
    (5, "المائدة", "Al-Maidah", "medinan", 120),
    (6, "الأنعام", "Al-Anam", "meccan", 165),
    (7, "الأعراف", "Al-Araf", "meccan", 206),
    (8, "الأنفال", "Al-Anfal", "medinan", 75),
    (9, "التوبة", "At-Tawbah", "medinan", 129),
    (10, "يونس", "Yunus", "meccan", 109),
    (11, "هود", "Hud", "meccan", 123),
    (12, "يوسف", "Yusuf", "meccan", 111),
    (13, "الرعد", "Ar-Rad", "medinan", 43),
    (14, "إبراهيم", "Ibrahim", "meccan", 52),
    (15, "الحجر", "Al-Hijr", "meccan", 99),
    (16, "النحل", "An-Nahl", "meccan", 128),
    (17, "الإسراء", "Al-Isra", "meccan", 111),
    (18, "الكهف", "Al-Kahf", "meccan", 110),
    (19, "مريم", "Maryam", "meccan", 98),
    (20, "طه", "Taha", "meccan", 135),
    (21, "الأنبياء", "Al-Anbiya", "meccan", 112),
    (22, "الحج", "Al-Hajj", "medinan", 78),
    (23, "المؤمنون", "Al-Muminun", "meccan", 118),
    (24, "النور", "An-Nur", "medinan", 64),
    (25, "الفرقان", "Al-Furqan", "meccan", 77),
    (26, "الشعراء", "Ash-Shuara", "meccan", 227),
    (27, "النمل", "An-Naml", "meccan", 93),
    (28, "القصص", "Al-Qasas", "meccan", 88),
    (29, "العنكبوت", "Al-Ankabut", "meccan", 69),
    (30, "الروم", "Ar-Rum", "meccan", 60),
    (31, "لقمان", "Luqman", "meccan", 34),
    (32, "السجدة", "As-Sajdah", "meccan", 30),
    (33, "الأحزاب", "Al-Ahzab", "medinan", 73),
    (34, "سبأ", "Saba", "meccan", 54),
    (35, "فاطر", "Fatir", "meccan", 45),
    (36, "يس", "Ya-Sin", "meccan", 83),
    (37, "الصافات", "As-Saffat", "meccan", 182),
    (38, "ص", "Sad", "meccan", 88),
    (39, "الزمر", "Az-Zumar", "meccan", 75),
    (40, "غافر", "Ghafir", "meccan", 85),
    (41, "فصلت", "Fussilat", "meccan", 54),
    (42, "الشورى", "Ash-Shura", "meccan", 53),
    (43, "الزخرف", "Az-Zukhruf", "meccan", 89),
    (44, "الدخان", "Ad-Dukhan", "meccan", 59),
    (45, "الجاثية", "Al-Jathiyah", "meccan", 37),
    (46, "الأحقاف", "Al-Ahqaf", "meccan", 35),
    (47, "محمد", "Muhammad", "medinan", 38),
    (48, "الفتح", "Al-Fath", "medinan", 29),
    (49, "الحجرات", "Al-Hujurat", "medinan", 18),
    (50, "ق", "Qaf", "meccan", 45),
    (51, "الذاريات", "Adh-Dhariyat", "meccan", 60),
    (52, "الطور", "At-Tur", "meccan", 49),
    (53, "النجم", "An-Najm", "meccan", 62),
    (54, "القمر", "Al-Qamar", "meccan", 55),
    (55, "الرحمن", "Ar-Rahman", "medinan", 78),
    (56, "الواقعة", "Al-Waqiah", "meccan", 96),
    (57, "الحديد", "Al-Hadid", "medinan", 29),
    (58, "المجادلة", "Al-Mujadila", "medinan", 22),
    (59, "الحشر", "Al-Hashr", "medinan", 24),
    (60, "الممتحنة", "Al-Mumtahanah", "medinan", 13),
    (61, "الصف", "As-Saf", "medinan", 14),
    (62, "الجمعة", "Al-Jumuah", "medinan", 11),
    (63, "المنافقون", "Al-Munafiqun", "medinan", 11),
    (64, "التغابن", "At-Taghabun", "medinan", 18),
    (65, "الطلاق", "At-Talaq", "medinan", 12),
    (66, "التحريم", "At-Tahrim", "medinan", 12),
    (67, "الملك", "Al-Mulk", "meccan", 30),
    (68, "القلم", "Al-Qalam", "meccan", 52),
    (69, "الحاقة", "Al-Haqqah", "meccan", 52),
    (70, "المعارج", "Al-Maarij", "meccan", 44),
    (71, "نوح", "Nuh", "meccan", 28),
    (72, "الجن", "Al-Jinn", "meccan", 28),
    (73, "المزمل", "Al-Muzzammil", "meccan", 20),
    (74, "المدثر", "Al-Muddaththir", "meccan", 56),
    (75, "القيامة", "Al-Qiyamah", "meccan", 40),
    (76, "الإنسان", "Al-Insan", "medinan", 31),
    (77, "المرسلات", "Al-Mursalat", "meccan", 50),
    (78, "النبأ", "An-Naba", "meccan", 40),
    (79, "النازعات", "An-Naziat", "meccan", 46),
    (80, "عبس", "Abasa", "meccan", 42),
    (81, "التكوير", "At-Takwir", "meccan", 29),
    (82, "الانفطار", "Al-Infitar", "meccan", 19),
    (83, "المطففين", "Al-Mutaffifin", "meccan", 36),
    (84, "الانشقاق", "Al-Inshiqaq", "meccan", 25),
    (85, "البروج", "Al-Buruj", "meccan", 22),
    (86, "الطارق", "At-Tariq", "meccan", 17),
    (87, "الأعلى", "Al-Ala", "meccan", 19),
    (88, "الغاشية", "Al-Ghashiyah", "meccan", 26),
    (89, "الفجر", "Al-Fajr", "meccan", 30),
    (90, "البلد", "Al-Balad", "meccan", 20),
    (91, "الشمس", "Ash-Shams", "meccan", 15),
    (92, "الليل", "Al-Layl", "meccan", 21),
    (93, "الضحى", "Ad-Duha", "meccan", 11),
    (94, "الشرح", "Ash-Sharh", "meccan", 8),
    (95, "التين", "At-Tin", "meccan", 8),
    (96, "العلق", "Al-Alaq", "meccan", 19),
    (97, "القدر", "Al-Qadr", "meccan", 5),
    (98, "البينة", "Al-Bayyinah", "medinan", 8),
    (99, "الزلزلة", "Az-Zalzalah", "medinan", 8),
    (100, "العاديات", "Al-Adiyat", "meccan", 11),
    (101, "القارعة", "Al-Qariah", "meccan", 11),
    (102, "التكاثر", "At-Takathur", "meccan", 8),
    (103, "العصر", "Al-Asr", "meccan", 3),
    (104, "الهمزة", "Al-Humazah", "meccan", 9),
    (105, "الفيل", "Al-Fil", "meccan", 5),
    (106, "قريش", "Quraysh", "meccan", 4),
    (107, "الماعون", "Al-Maun", "meccan", 7),
    (108, "الكوثر", "Al-Kawthar", "meccan", 3),
    (109, "الكافرون", "Al-Kafirun", "meccan", 6),
    (110, "النصر", "An-Nasr", "medinan", 3),
    (111, "المسد", "Al-Masad", "meccan", 5),
    (112, "الإخلاص", "Al-Ikhlas", "meccan", 4),
    (113, "الفلق", "Al-Falaq", "meccan", 5),
    (114, "الناس", "An-Nas", "meccan", 6),
]


def _fetch_alquran_cloud() -> dict[str, Any] | None:
    url = "https://api.alquran.cloud/v1/quran/quran-uthmani"
    en_url = "https://api.alquran.cloud/v1/quran/en.sahih"
    try:
        with httpx.Client(timeout=120.0, verify=False) as client:
            ar = client.get(url).json()
            en = client.get(en_url).json()
        if ar.get("code") != 200 or en.get("code") != 200:
            return None
        return {"arabic": ar["data"]["surahs"], "english": en["data"]["surahs"]}
    except Exception as e:
        print(f"alquran.cloud failed: {e}")
        return None


def build_corpus() -> dict[str, Any]:
    payload = _fetch_alquran_cloud()
    if not payload:
        raise RuntimeError("Could not download Quran text. Check network.")

    en_map: dict[tuple[int, int], str] = {}
    for surah in payload["english"]:
        sn = surah["number"]
        for ayah in surah["ayahs"]:
            en_map[(sn, ayah["numberInSurah"])] = ayah["text"]

    surahs = []
    ayahs = []
    for meta in SURAHS_META:
        num, name_ar, name_en, rev, count = meta
        surahs.append(
            {
                "number": num,
                "name_ar": name_ar,
                "name_en": name_en,
                "revelation_type": rev,
                "ayah_count": count,
            }
        )

    for surah in payload["arabic"]:
        sn = surah["number"]
        for ayah in surah["ayahs"]:
            an = ayah["numberInSurah"]
            ayahs.append(
                {
                    "surah": sn,
                    "ayah": an,
                    "text_ar": ayah["text"],
                    "transliteration": "",
                    "translation_en": en_map.get((sn, an), ""),
                    "popularity_score": 0.1,
                }
            )

    return {"surahs": surahs, "ayahs": ayahs}


def download_full_quran(out_path: Path) -> Path:
    if out_path.exists() and out_path.stat().st_size > 100_000:
        print(f"Using cached {out_path}")
        return out_path
    print("Downloading full Quran corpus...")
    corpus = build_corpus()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(corpus, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(corpus['ayahs'])} ayahs -> {out_path}")
    return out_path
