import type { Language } from "../domain/model";
const en = {
  title: "Sign in to Liyanna",
  hint: "Use the account provided by the Liyanna owner.",
  email: "Email",
  password: "Password",
  signIn: "Sign in",
  signOut: "Sign out",
  forgot: "Forgot password?",
  checking: "Checking your account…",
  verifyError:
    "Unable to verify your account. Check your connection and try again.",
  retry: "Retry",
  sent: "If this account exists, check your email for a password reset link.",
  language: "Language",
  newBusiness: "Set up a new business",
  choose: "Choose your business",
  chooseHint:
    "Open a shared business or set up a business stored on this device.",
  open: "Open",
  membershipError: "Unable to load your businesses. Retry before continuing.",
  legacy: "Existing browser records",
  legacyHint:
    "Records from the earlier version are still on this device. Import them only if they belong to you. They will not be uploaded automatically.",
  exportLegacy: "Download existing records",
  importLegacy: "Import existing records",
  confirmLegacy:
    "Import these existing browser records into this account? Any current local workspace for this account will be replaced. Download a backup first.",
  imported: "Existing records imported",
  localHint:
    "Business records stay on this device unless you choose cloud backup or team sharing.",
};
const si: typeof en = {
  title: "Liyanna වෙත පිවිසෙන්න",
  hint: "Liyanna හිමිකරු ලබාදුන් ගිණුම භාවිතා කරන්න.",
  email: "ඊමේල්",
  password: "මුරපදය",
  signIn: "පිවිසෙන්න",
  signOut: "ඉවත් වන්න",
  forgot: "මුරපදය අමතකද?",
  checking: "ගිණුම පරීක්ෂා කරමින්…",
  verifyError:
    "ගිණුම තහවුරු කළ නොහැක. සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.",
  retry: "නැවත උත්සාහ කරන්න",
  sent: "මෙම ගිණුම පවතී නම් මුරපදය යළි සැකසීමට ඊමේල් පණිවිඩය පරීක්ෂා කරන්න.",
  language: "භාෂාව",
  newBusiness: "නව ව්‍යාපාරයක් සකසන්න",
  choose: "ඔබේ ව්‍යාපාරය තෝරන්න",
  chooseHint:
    "බෙදාගත් ව්‍යාපාරයක් විවෘත කරන්න හෝ මෙම උපාංගයේ ව්‍යාපාරයක් සකසන්න.",
  open: "විවෘත කරන්න",
  membershipError:
    "ව්‍යාපාර පූරණය කළ නොහැක. ඉදිරියට යාමට පෙර නැවත උත්සාහ කරන්න.",
  legacy: "පවතින බ්‍රවුසර වාර්තා",
  legacyHint:
    "පෙර අනුවාදයේ වාර්තා මෙම උපාංගයේ පවතී. ඒවා ඔබට අයත් නම් පමණක් ආයාත කරන්න. ඒවා ස්වයංක්‍රීයව උඩුගත නොවේ.",
  exportLegacy: "පවතින වාර්තා බාගන්න",
  importLegacy: "පවතින වාර්තා ආයාත කරන්න",
  confirmLegacy:
    "පවතින වාර්තා මෙම ගිණුමට ආයාත කරන්නද? මෙම ගිණුමේ දේශීය වැඩබිම ප්‍රතිස්ථාපනය වේ. පළමුව උපස්ථයක් බාගන්න.",
  imported: "වාර්තා ආයාත විය",
  localHint:
    "වලාකුළු උපස්ථ හෝ කණ්ඩායම් බෙදාගැනීම තෝරන තුරු වාර්තා මෙම උපාංගයේ පවතී.",
};
const ta: typeof en = {
  title: "Liyanna இல் உள்நுழையவும்",
  hint: "Liyanna உரிமையாளர் வழங்கிய கணக்கைப் பயன்படுத்தவும்.",
  email: "மின்னஞ்சல்",
  password: "கடவுச்சொல்",
  signIn: "உள்நுழை",
  signOut: "வெளியேறு",
  forgot: "கடவுச்சொல்லை மறந்துவிட்டீர்களா?",
  checking: "கணக்கைச் சரிபார்க்கிறது…",
  verifyError:
    "கணக்கை உறுதிப்படுத்த முடியவில்லை. இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
  retry: "மீண்டும் முயற்சி",
  sent: "இந்தக் கணக்கு இருந்தால் கடவுச்சொல்லை மீட்டமைக்கும் மின்னஞ்சலைப் பார்க்கவும்.",
  language: "மொழி",
  newBusiness: "புதிய வணிகத்தை அமைக்கவும்",
  choose: "உங்கள் வணிகத்தைத் தேர்ந்தெடுக்கவும்",
  chooseHint:
    "பகிரப்பட்ட வணிகத்தைத் திறக்கவும் அல்லது இந்தச் சாதனத்தில் வணிகத்தை அமைக்கவும்.",
  open: "திற",
  membershipError:
    "வணிகங்களை ஏற்ற முடியவில்லை. தொடர்வதற்கு முன் மீண்டும் முயற்சிக்கவும்.",
  legacy: "ஏற்கனவே உள்ள உலாவிப் பதிவுகள்",
  legacyHint:
    "முந்தைய பதிப்பின் பதிவுகள் இந்தச் சாதனத்தில் உள்ளன. அவை உங்களுடையதாக இருந்தால் மட்டும் இறக்குமதி செய்யவும். அவை தானாகப் பதிவேற்றப்படாது.",
  exportLegacy: "ஏற்கனவே உள்ள பதிவுகளைப் பதிவிறக்கு",
  importLegacy: "ஏற்கனவே உள்ள பதிவுகளை இறக்குமதி செய்",
  confirmLegacy:
    "இந்தப் பதிவுகளை இக்கணக்கில் இறக்குமதி செய்யவா? இக்கணக்கின் உள்ளூர் பணியிடம் மாற்றப்படும். முதலில் காப்புப்பிரதியைப் பதிவிறக்கவும்.",
  imported: "பதிவுகள் இறக்குமதி செய்யப்பட்டன",
  localHint:
    "மேகக் காப்புப்பிரதி அல்லது குழுப் பகிர்வைத் தேர்ந்தெடுக்கும் வரை வணிகப் பதிவுகள் இந்தச் சாதனத்தில் இருக்கும்.",
};
export const accessCopy = (language: Language) => ({ en, si, ta })[language];
