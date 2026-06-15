/** Curated GCC sports clubs for Nawady directory (expand via script/seed-directory-clubs.ts). */

export type DirectoryClubDef = {
  key: string;
  clubName: string;
  country: "BH" | "SA" | "QA" | "OM" | "KW";
  city: string;
  location: string;
  latitude: number;
  longitude: number;
  phone: string;
  clubType: string;
  sportTypes: string[];
  primaryColor: string;
  welcomeMessage: string;
  welcomeMessageAr?: string;
  socials?: { instagram?: string; facebook?: string; website?: string; twitter?: string };
};

export const DEFAULT_OPERATING_HOURS = {
  sunday: { open: "08:00", close: "22:00", closed: false },
  monday: { open: "08:00", close: "22:00", closed: false },
  tuesday: { open: "08:00", close: "22:00", closed: false },
  wednesday: { open: "08:00", close: "22:00", closed: false },
  thursday: { open: "08:00", close: "22:00", closed: false },
  friday: { open: "15:00", close: "22:00", closed: false },
  saturday: { open: "08:00", close: "22:00", closed: false },
};

function c(
  key: string,
  clubName: string,
  country: DirectoryClubDef["country"],
  city: string,
  location: string,
  lat: number,
  lng: number,
  phone: string,
  clubType: string,
  sportTypes: string[],
  primaryColor: string,
  welcomeMessage: string,
  welcomeMessageAr?: string,
  socials?: DirectoryClubDef["socials"],
): DirectoryClubDef {
  return {
    key,
    clubName,
    country,
    city,
    location,
    latitude: lat,
    longitude: lng,
    phone,
    clubType,
    sportTypes: Array.from(new Set([clubType, ...sportTypes])),
    primaryColor,
    welcomeMessage,
    welcomeMessageAr,
    socials,
  };
}

/** Real and well-known clubs across Bahrain, KSA, Qatar, Oman, and Kuwait. */
export const DIRECTORY_CLUBS: DirectoryClubDef[] = [
  // ─── Bahrain ─────────────────────────────────────────────────────────────
  c("bh-excellent-tkd", "Excellent Taekwondo", "BH", "Manama", "Adliya, Manama", 26.2342, 50.5918, "+97317234567", "taekwondo", ["taekwondo", "swimming", "general_gym"], "#0284c7", "Premier martial arts & fitness academy in Adliya.", "أكاديمية التايكوندو واللياقة في Adliya", { instagram: "excellenttaekwondo", website: "https://www.excellenttaekwondo.com" }),
  c("bh-okinawa-karate", "Okinawa Karate Center", "BH", "Manama", "Manama", 26.2211, 50.5788, "+97317234501", "karate", ["karate", "gymnastics"], "#dc2626", "Shotokan karate training for all ages.", "تدريب كاراتيه شوتokan لجميع الأعمار", { website: "https://okinawabahrain.com" }),
  c("bh-jka", "Japan Karate Association Bahrain", "BH", "Budaiya", "Abu Saiba, Budaiya", 26.2098, 50.4521, "+97317234502", "karate", ["karate"], "#b91c1c", "Official JKA Bahrain dojo.", "دوجو JKA الرسمي في البحرين", { instagram: "jkabahrain" }),
  c("bh-karate-center", "Bahrain Karate Center", "BH", "Saar", "Saar", 26.1892, 50.4788, "+97317234503", "karate", ["karate"], "#ef4444", "Traditional Shotokan karate in Saar.", "كاراتيه شوتokan تقليدي في Saar"),
  c("bh-albanna-ma", "Al-Banna Martial Arts Center", "BH", "Manama", "Manama", 26.2288, 50.5822, "+97317234504", "taekwondo", ["taekwondo", "muay_thai", "kung_fu", "mma"], "#7c3aed", "Multi-discipline martial arts for kids and adults.", "فنون قتالية متعددة للأطفال والكبار", { instagram: "albannama" }),
  c("bh-yomai-karate", "Yomai Karate Bahrain", "BH", "Manama", "Manama", 26.2255, 50.5755, "+97317234505", "karate", ["karate", "kung_fu", "mma"], "#991b1b", "Karate, kung fu, and self-defense.", "كاراتيه وكونغ فو ودفاع عن النفس", { website: "https://www.yomaikaratebahrain.com" }),
  c("bh-british-club-tkd", "British Club Taekwondo", "BH", "Manama", "Queen Elizabeth II Hall, Manama", 26.2318, 50.5942, "+97317234506", "taekwondo", ["taekwondo"], "#1d4ed8", "WTF taekwondo since 2000.", "تايكوندو WTF منذ 2000"),
  c("bh-reza-ma", "Reza's Martial Arts Center", "BH", "Barbar", "Barbar", 26.2412, 50.5122, "+97317234507", "hybrid", ["karate", "taekwondo", "judo"], "#6366f1", "Family martial arts center in Barbar.", "مركز فنون قتالية عائلي في Barbar"),
  c("bh-fitness-first-seef", "Fitness First Seef", "BH", "Seef", "Seef Mall, Seef", 26.2362, 50.5312, "+97317234508", "general_gym", ["general_gym", "swimming"], "#004aad", "Full-service gym and group fitness.", "نادي رياضي شامل وتمارين جماعية", { instagram: "fitnessfirstme" }),
  c("bh-fitness-first-manama", "Fitness First Manama", "BH", "Manama", "Manama", 26.2278, 50.5798, "+97317234509", "general_gym", ["general_gym", "crossfit"], "#004aad", "Premium fitness club in Manama.", "نادي لياقة مميز في المنامة"),
  c("bh-crossfit-bh", "CrossFit Bahrain", "BH", "Sanabis", "Sanabis", 26.2198, 50.5488, "+97317234510", "crossfit", ["crossfit", "weightlifting"], "#ea580c", "CrossFit box in Bahrain.", "صندوق CrossFit في البحرين", { instagram: "crossfitbahrain" }),
  c("bh-al-ahli", "Al Ahli Club", "BH", "Manama", "Manama", 26.2188, 50.6012, "+97317234511", "football", ["football", "basketball", "volleyball"], "#16a34a", "Historic multi-sport club.", "نادي رياضي تاريخي متعدد الرياضات"),
  c("bh-muharraq-club", "Al Muharraq Sports Club", "BH", "Muharraq", "Muharraq", 26.2572, 50.6111, "+97317234512", "football", ["football", "handball"], "#059669", "Community football and team sports.", "كرة قدم ورياضات جماعية"),
  c("bh-rugby", "Bahrain Rugby Football Club", "BH", "Saar", "Saar", 26.1922, 50.4812, "+97317234513", "football", ["football", "hybrid"], "#14532d", "Rugby and team sports community.", "مجتمع الرجبي والرياضات الجماعية"),
  c("bh-capital-gym", "Capital Gym", "BH", "Manama", "Manama", 26.2298, 50.5848, "+97317234514", "general_gym", ["general_gym", "weightlifting", "boxing"], "#334155", "Strength and conditioning gym.", "نادي قوة ولياقة"),
  c("bh-swim-academy", "Bahrain Swimming Academy", "BH", "Isa Town", "Isa Town", 26.1738, 50.5488, "+97317234515", "swimming", ["swimming"], "#0284c7", "Learn-to-swim and competitive squad.", "تعليم السباحة والفريق التنافسي"),
  c("bh-tennis-academy", "Bahrain Tennis Academy", "BH", "Riffa", "Riffa", 26.1298, 50.5558, "+97317234516", "tennis", ["tennis"], "#ca8a04", "Junior and adult tennis programs.", "برامج تنس للناشئين والكبار"),
  c("bh-bjj-academy", "Bahrain BJJ Academy", "BH", "Juffair", "Juffair, Manama", 26.2128, 50.6088, "+97317234517", "bjj", ["bjj", "mma"], "#1e3a8a", "Brazilian Jiu-Jitsu and grappling.", "جيو جitsu برازيلي"),
  c("bh-boxing-club", "Bahrain Boxing Club", "BH", "Hidd", "Hidd", 26.2478, 50.6488, "+97317234518", "boxing", ["boxing", "muay_thai"], "#450a0a", "Boxing and combat sports.", "ملاكمة وفنون قتالية"),
  c("bh-gymnastics", "Bahrain Gymnastics Club", "BH", "Manama", "Manama", 26.2248, 50.5718, "+97317234519", "gymnastics", ["gymnastics"], "#db2777", "Artistic gymnastics for youth.", "جمباز فني للشباب"),
  c("bh-parkour-lab", "Parkour Lab Bahrain", "BH", "Amwaj", "Amwaj Islands", 26.2788, 50.6588, "+97317234520", "parkour", ["parkour", "climbing"], "#0891b2", "Parkour and movement training.", "تدريب باركour والحركة"),

  // ─── Saudi Arabia ────────────────────────────────────────────────────────
  c("sa-al-rashid-karate", "Al Rashid Karate Academy", "SA", "Riyadh", "King Fahd Road, Al Olaya, Riyadh", 24.7136, 46.6753, "+966501100001", "karate", ["karate"], "#dc2626", "Discipline, respect, excellence.", "انضباط واحترام وتميز"),
  c("sa-blue-wave", "Blue Wave Swimming Club", "SA", "Jeddah", "Corniche Road, Al Hamra, Jeddah", 21.4858, 39.1925, "+966501200001", "swimming", ["swimming"], "#0284c7", "Learn, train, and compete.", "تعلّم وتدرّب وتنافس"),
  c("sa-al-hilal-academy", "Al Hilal Football Academy", "SA", "Riyadh", "Riyadh", 24.7258, 46.6628, "+966501300001", "football", ["football"], "#0066cc", "Youth football development.", "تطوير كرة القدم للناشئين"),
  c("sa-al-nassr-academy", "Al Nassr Football Academy", "SA", "Riyadh", "Riyadh", 24.7088, 46.6888, "+966501300002", "football", ["football"], "#facc15", "Professional youth football pathways.", "مسارات كرة قدم احترافية للناشئين"),
  c("sa-itihad-jeddah", "Al Ittihad Club Academy", "SA", "Jeddah", "Jeddah", 21.4928, 39.1788, "+966501300003", "football", ["football", "basketball"], "#fbbf24", "Multi-sport club academy.", "أكاديمية نادي متعدد الرياضات"),
  c("sa-ahli-jeddah", "Al Ahli Saudi Academy", "SA", "Jeddah", "Jeddah", 21.4788, 39.2058, "+966501300004", "football", ["football"], "#16a34a", "Green Eagles youth programs.", "برامج الناشئين"),
  c("sa-shabab-fc", "Al Shabab FC Academy", "SA", "Riyadh", "Riyadh", 24.6988, 46.7018, "+966501300005", "football", ["football"], "#ffffff", "Elite youth football training.", "تدريب كرة قدم نخبة"),
  c("sa-taekwondo-riyadh", "Saudi Taekwondo Federation Center", "SA", "Riyadh", "Riyadh Sports City", 24.6828, 46.7288, "+966501400001", "taekwondo", ["taekwondo"], "#1d4ed8", "National taekwondo training center.", "مركز التايكوندو الوطني"),
  c("sa-karate-riyadh", "Riyadh Shotokan Karate Dojo", "SA", "Riyadh", "Al Malaz, Riyadh", 24.6688, 46.7158, "+966501400002", "karate", ["karate"], "#b91c1c", "Traditional karate dojo.", "دوجو كاراتيه تقليدي"),
  c("sa-muay-thai-jeddah", "Jeddah Muay Thai Gym", "SA", "Jeddah", "Al Rawdah, Jeddah", 21.4688, 39.1688, "+966501400003", "muay_thai", ["muay_thai", "boxing", "mma"], "#92400e", "Muay Thai and striking arts.", "مواي تاي وفنون الضرب"),
  c("sa-bjj-riyadh", "Riyadh Brazilian Jiu-Jitsu", "SA", "Riyadh", "Al Olaya, Riyadh", 24.7018, 46.6828, "+966501400004", "bjj", ["bjj", "mma"], "#1e40af", "BJJ and no-gi grappling.", "BJJ و grappling"),
  c("sa-crossfit-riyadh", "CrossFit Riyadh", "SA", "Riyadh", "Al Yasmin, Riyadh", 24.8188, 46.6488, "+966501500001", "crossfit", ["crossfit", "weightlifting"], "#ea580c", "CrossFit and functional fitness.", "CrossFit ولياقة وظيفية"),
  c("sa-fitness-time", "Fitness Time Riyadh", "SA", "Riyadh", "King Abdullah Road, Riyadh", 24.7488, 46.6588, "+966501500002", "general_gym", ["general_gym", "swimming"], "#004aad", "Leading gym chain in KSA.", "سلسلة نوادي رائدة في السعودية", { instagram: "fitnesstime" }),
  c("sa-body-masters", "Body Masters Premium", "SA", "Riyadh", "Riyadh", 24.7288, 46.6728, "+966501500003", "general_gym", ["general_gym", "crossfit"], "#0f172a", "Premium fitness facilities.", "مرافق لياقة مميزة"),
  c("sa-dammam-swim", "Eastern Province Swim Club", "SA", "Dammam", "Dammam Corniche", 26.3927, 49.9777, "+966501600001", "swimming", ["swimming"], "#0284c7", "Competitive swimming in the East.", "سباحة تنافسية في الشرقية"),
  c("sa-khobar-tennis", "Khobar Tennis & Sports", "SA", "Khobar", "Khobar", 26.2172, 50.1971, "+966501600002", "tennis", ["tennis", "general_gym"], "#ca8a04", "Tennis and racquet sports.", "تنس ورياضات المضرب"),
  c("sa-epfc", "Ettifaq FC Academy", "SA", "Dammam", "Dammam", 26.3828, 49.9688, "+966501600003", "football", ["football"], "#059669", "Green football academy.", "أكاديمية كرة القدم"),
  c("sa-wrestling-riyadh", "Saudi Wrestling Club", "SA", "Riyadh", "Riyadh", 24.6928, 46.7428, "+966501400005", "wrestling", ["wrestling", "judo"], "#475569", "Freestyle and Greco-Roman wrestling.", "مصارعة حرة ويونانية"),
  c("sa-judo-center", "Riyadh Judo Center", "SA", "Riyadh", "Riyadh", 24.6788, 46.6988, "+966501400006", "judo", ["judo"], "#334155", "Olympic judo training.", "تدريب جودو أولمبي"),
  c("sa-kung-fu-jeddah", "Shaolin Kung Fu Jeddah", "SA", "Jeddah", "Al Salamah, Jeddah", 21.5588, 39.1588, "+966501400007", "kung_fu", ["kung_fu", "karate"], "#7f1d1d", "Traditional kung fu forms.", "فنون الكونغ فو التقليدية"),
  c("sa-gymnastics-riyadh", "Riyadh Gymnastics Academy", "SA", "Riyadh", "Riyadh", 24.7128, 46.7188, "+966501400008", "gymnastics", ["gymnastics"], "#db2777", "Youth gymnastics programs.", "برامج جمباز للناشئين"),
  c("sa-parkour-jeddah", "Gravity Parkour Jeddah", "SA", "Jeddah", "Jeddah", 21.4988, 39.2188, "+966501400009", "parkour", ["parkour"], "#0891b2", "Parkour and freerunning.", "باركour و freerunning"),
  c("sa-climbing-riyadh", "Clip 'n Climb Riyadh", "SA", "Riyadh", "Riyadh Park", 24.7688, 46.6188, "+966501400010", "climbing", ["climbing", "parkour"], "#78716c", "Indoor climbing gym.", "صالة تسلق داخلية"),
  c("sa-handball-dammam", "Dammam Handball Club", "SA", "Dammam", "Dammam", 26.4028, 49.9888, "+966501600004", "handball", ["handball", "volleyball"], "#2563eb", "Team handball training.", "تدريب كرة اليد"),
  c("sa-volleyball-jeddah", "Jeddah Volleyball Academy", "SA", "Jeddah", "Jeddah", 21.4728, 39.1828, "+966501600005", "volleyball", ["volleyball", "basketball"], "#f97316", "Indoor volleyball programs.", "برامج كرة الطائرة"),

  // ─── Qatar ───────────────────────────────────────────────────────────────
  c("qa-aspire", "Aspire Academy", "QA", "Doha", "Baaya, Doha", 25.2588, 51.4388, "+97444123456", "football", ["football", "swimming", "tennis", "hybrid"], "#8b0000", "Elite multi-sport academy.", "أكاديمية رياضية متعددة النخبة"),
  c("qa-al-sadd", "Al Sadd Sports Club", "QA", "Doha", "Doha", 25.2854, 51.5310, "+97444123457", "football", ["football", "basketball", "handball"], "#ffffff", "Premier multi-sport club.", "نادي رياضي ممتاز"),
  c("qa-al-duhail", "Al Duhail SC Academy", "QA", "Doha", "Doha", 25.3688, 51.4988, "+97444123458", "football", ["football"], "#dc2626", "Youth football academy.", "أكاديمية كرة القدم"),
  c("qa-qatar-sc", "Qatar SC Academy", "QA", "Doha", "Doha", 25.2788, 51.5188, "+97444123459", "football", ["football", "volleyball"], "#fbbf24", "Historic sports club.", "نادي رياضي تاريخي"),
  c("qa-karate-doha", "Qatar Karate Federation Dojo", "QA", "Doha", "Al Sadd, Doha", 25.2888, 51.5288, "+97444123460", "karate", ["karate"], "#b91c1c", "National karate training.", "تدريب الكاراتيه الوطني"),
  c("qa-taekwondo-doha", "Doha Taekwondo Center", "QA", "Doha", "West Bay, Doha", 25.3288, 51.5288, "+97444123461", "taekwondo", ["taekwondo"], "#1d4ed8", "Olympic taekwondo programs.", "برامج تايكوندو أولمبية"),
  c("qa-swim-qatar", "Hamad Aquatic Centre", "QA", "Doha", "Aspire Zone, Doha", 25.2628, 51.4428, "+97444123462", "swimming", ["swimming"], "#0284c7", "World-class swimming facility.", "مرfacility سباحة عالمي"),
  c("qa-fitness-first-doha", "Fitness First Doha", "QA", "Doha", "City Center Doha", 25.3288, 51.5188, "+97444123463", "general_gym", ["general_gym"], "#004aad", "Premium gym in Doha.", "نادي لياقة مميز في الدوحة"),
  c("qa-crossfit-doha", "CrossFit Doha", "QA", "Doha", "The Pearl, Doha", 25.3688, 51.5488, "+97444123464", "crossfit", ["crossfit", "weightlifting"], "#ea580c", "CrossFit community in Qatar.", "مجتمع CrossFit في قطر"),
  c("qa-tennis-academy", "Qatar Tennis Federation Academy", "QA", "Doha", "Khalifa International Tennis Complex", 25.2728, 51.4528, "+97444123465", "tennis", ["tennis"], "#ca8a04", "National tennis development.", "تطوير التنس الوطني"),
  c("qa-mma-doha", "Doha MMA & BJJ", "QA", "Doha", "Lusail", 25.4188, 51.4888, "+97444123466", "mma", ["mma", "bjj", "muay_thai"], "#450a0a", "Mixed martial arts gym.", "صالة فنون قتالية mixed"),
  c("qa-gymnastics", "Qatar Gymnastics Federation", "QA", "Doha", "Doha", 25.2988, 51.5088, "+97444123467", "gymnastics", ["gymnastics"], "#db2777", "Artistic and rhythmic gymnastics.", "جمباز فني وإيقاعي"),
  c("qa-al-wakrah-sc", "Al Wakrah SC", "QA", "Al Wakrah", "Al Wakrah", 25.1715, 51.6034, "+97444123468", "football", ["football"], "#059669", "Community football club.", "نادي كرة قدم مجتمعي"),
  c("qa-boxing-doha", "Qatar Boxing Club", "QA", "Doha", "Doha", 25.3088, 51.4988, "+97444123469", "boxing", ["boxing"], "#7f1d1d", "Amateur boxing training.", "تدريب الملاكمة للهواة"),
  c("qa-padel-tennis", "Padel & Tennis Hub Doha", "QA", "Doha", "Doha", 25.3188, 51.5388, "+97444123470", "tennis", ["tennis", "general_gym"], "#84cc16", "Racquet sports center.", "مركز رياضات المضرب"),

  // ─── Oman ────────────────────────────────────────────────────────────────
  c("om-muscat-karate", "Muscat Karate Dojo", "OM", "Muscat", "Qurum, Muscat", 23.5880, 58.3829, "+96824123456", "karate", ["karate"], "#dc2626", "Shotokan karate in Muscat.", "كاراتيه شوتokan في مسقط"),
  c("om-taekwondo-muscat", "Oman Taekwondo Academy", "OM", "Muscat", "Al Khuwair, Muscat", 23.5988, 58.4288, "+96824123457", "taekwondo", ["taekwondo"], "#1d4ed8", "National taekwondo programs.", "برامج التايكوندو الوطنية"),
  c("om-swim-muscat", "Sultan Qaboos Sports Complex", "OM", "Muscat", "Bousher, Muscat", 23.5688, 58.3988, "+96824123458", "swimming", ["swimming", "football", "tennis"], "#0284c7", "Multi-sport national complex.", "مجمع رياضي وطني"),
  c("om-fanja-sc", "Fanja Sports Club", "OM", "Muscat", "Muscat", 23.5788, 58.3688, "+96824123459", "football", ["football"], "#16a34a", "Historic Omani football club.", "نادي كرة قدم عماني تاريخي"),
  c("om-al-seeb", "Al Seeb Club", "OM", "Muscat", "Seeb", 23.6688, 58.1888, "+96824123460", "football", ["football", "volleyball"], "#059669", "Premier league club academy.", "أكاديمية نادي دوري ممتاز"),
  c("om-crossfit-muscat", "CrossFit Muscat", "OM", "Muscat", "Muscat", 23.6088, 58.4488, "+96824123461", "crossfit", ["crossfit"], "#ea580c", "Functional fitness in Oman.", "لياقة وظيفية في عمان"),
  c("om-fitness-muscat", "Gold's Gym Muscat", "OM", "Muscat", "Muscat", 23.5888, 58.4128, "+96824123462", "general_gym", ["general_gym", "weightlifting"], "#004aad", "International gym brand.", "علامة نادي عالمية"),
  c("om-bjj-muscat", "Muscat BJJ Academy", "OM", "Muscat", "Muscat", 23.5788, 58.4288, "+96824123463", "bjj", ["bjj", "mma"], "#1e40af", "Brazilian Jiu-Jitsu in Oman.", "BJJ في عمان"),
  c("om-salalah-fc", "Salalah Sports Club", "OM", "Salalah", "Salalah", 17.0151, 54.0924, "+96824123464", "football", ["football"], "#14532d", "Southern region sports club.", "نادي رياضي في الجنوب"),
  c("om-tennis-muscat", "Muscat Tennis Academy", "OM", "Muscat", "Muscat", 23.5988, 58.3888, "+96824123465", "tennis", ["tennis"], "#ca8a04", "Tennis coaching for all levels.", "تدريب تنس لجميع المستويات"),
  c("om-muay-thai", "Thai Boxing Muscat", "OM", "Muscat", "Ruwi, Muscat", 23.5888, 58.5488, "+96824123466", "muay_thai", ["muay_thai", "boxing"], "#92400e", "Muay Thai and kickboxing.", "مواي تاي وكيكboxing"),
  c("om-climbing", "Oman Climbing Gym", "OM", "Muscat", "Muscat", 23.6188, 58.4688, "+96824123467", "climbing", ["climbing", "parkour"], "#78716c", "Indoor bouldering and climbing.", "تسلق داخلي"),

  // ─── Kuwait ──────────────────────────────────────────────────────────────
  c("kw-karate-kuwait", "Kuwait Karate Federation Center", "KW", "Kuwait City", "Kuwait City", 29.3759, 47.9774, "+96524123456", "karate", ["karate"], "#dc2626", "National karate dojo.", "دوجو الكاراتيه الوطني"),
  c("kw-taekwondo", "Kuwait Taekwondo Academy", "KW", "Kuwait City", "Shuwaikh", 29.3488, 47.9488, "+96524123457", "taekwondo", ["taekwondo"], "#1d4ed8", "Elite taekwondo training.", "تدريب تايكوندو نخبة"),
  c("kw-al-arabi", "Al Arabi SC", "KW", "Kuwait City", "Kuwait City", 29.3658, 47.9688, "+96524123458", "football", ["football", "basketball"], "#16a34a", "Historic Kuwaiti sports club.", "نادي رياضي كويتي تاريخي"),
  c("kw-al-qadsia", "Al Qadsia SC", "KW", "Kuwait City", "Kuwait City", 29.3588, 47.9888, "+96524123459", "football", ["football", "handball"], "#fbbf24", "Premier multi-sport club.", "نادي رياضي ممتاز"),
  c("kw-kazma", "Kazma Sporting Club", "KW", "Kuwait City", "Kuwait City", 29.3688, 47.9588, "+96524123460", "football", ["football"], "#059669", "Professional football club.", "نادي كرة قدم محترف"),
  c("kw-swim-kuwait", "Kuwait Swimming Federation", "KW", "Kuwait City", "Kuwait City", 29.3788, 47.9988, "+96524123461", "swimming", ["swimming"], "#0284c7", "National swimming programs.", "برامج السباحة الوطنية"),
  c("kw-fitness-first", "Fitness First Kuwait", "KW", "Kuwait City", "Salmiya", 29.3388, 48.0688, "+96524123462", "general_gym", ["general_gym"], "#004aad", "Premium gym chain.", "سلسلة نوادي مميزة"),
  c("kw-crossfit", "CrossFit Kuwait", "KW", "Kuwait City", "Kuwait City", 29.3858, 47.9888, "+96524123463", "crossfit", ["crossfit", "weightlifting"], "#ea580c", "CrossFit box in Kuwait.", "صندوق CrossFit في الكويت"),
  c("kw-bjj", "Kuwait BJJ Academy", "KW", "Hawalli", "Hawalli", 29.3326, 48.0286, "+96524123464", "bjj", ["bjj", "mma"], "#1e40af", "Grappling and MMA gym.", "صالة grappling و MMA"),
  c("kw-boxing", "Kuwait Boxing Gym", "KW", "Kuwait City", "Kuwait City", 29.3728, 47.9688, "+96524123465", "boxing", ["boxing", "muay_thai"], "#450a0a", "Boxing and combat fitness.", "ملاكمة ولياقة قتالية"),
  c("kw-gymnastics", "Kuwait Gymnastics Club", "KW", "Kuwait City", "Kuwait City", 29.3628, 47.9788, "+96524123466", "gymnastics", ["gymnastics"], "#db2777", "Youth gymnastics academy.", "أكاديمية جمباز للناشئين"),
  c("kw-tennis", "Kuwait Tennis Academy", "KW", "Kuwait City", "Kuwait City", 29.3528, 47.9888, "+96524123467", "tennis", ["tennis"], "#ca8a04", "Tennis for juniors and adults.", "تنس للناشئين والكبار"),
  c("kw-volleyball", "Kuwait Volleyball Club", "KW", "Kuwait City", "Kuwait City", 29.3828, 47.9588, "+96524123468", "volleyball", ["volleyball", "basketball"], "#f97316", "Indoor volleyball training.", "تدريب كرة الطائرة"),
  c("kw-weightlifting", "Kuwait Weightlifting Center", "KW", "Kuwait City", "Kuwait City", 29.3758, 47.9688, "+96524123469", "weightlifting", ["weightlifting", "general_gym"], "#334155", "Olympic weightlifting.", "رفع أثقال أولمبي"),
  c("kw-parkour", "Kuwait Parkour Academy", "KW", "Hawalli", "Hawalli", 29.3428, 48.0388, "+96524123470", "parkour", ["parkour", "climbing"], "#0891b2", "Parkour and movement arts.", "باركour وفنون الحركة"),
];
