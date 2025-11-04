import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { LanguageToggle } from "./components/LanguageToggle";
import SourceStatistics from "./components/SourceStatistics";
import joinLogo from "./assets/join-logo.jpg";

// ======= Config =======
const API_BASE_URL = "https://fact-check-api-32dx.onrender.com";  // Using localhost as in Postman
const FACT_CHECK_URL = `${API_BASE_URL}/fact_check/`;  // Main endpoint from Postman
const COMPOSE_NEWS_URL = `${API_BASE_URL}/fact_check/compose_news/`;
const COMPOSE_TWEET_URL = `${API_BASE_URL}/fact_check/compose_tweet/`;

// ======= i18n (AR / EN) =======
const TRANSLATIONS = {
  arabic: {
    logoAlt: "شعار الجامعة",
    title: "التحقق من الأخبار",
    inputLabel: "اكتب عنوان الخبر المراد التحقق منه",
    placeholder: "مثال: الرئيس الأمريكي أعلن عن قرار جديد...",
    ariaInput: "مربع إدخال النص للتحقق من الخبر",
    errorNoQuery: "اكتب الخبر أولًا.",
    errorFetch: "تعذر الحصول على النتيجة",
    errorUnexpected: "حدث خطأ غير متوقع.",
    status: "الحالة",
    analysis: "التحليل",
    sources: "المصادر",
    none: "لا يوجد",
    noSources: "لا توجد مصادر متاحة.",
    generatedNews: "خبر مصاغ",
    copyGeneratedNewsAria: "نسخ الخبر المصاغ",
    copyGeneratedTweetAria: "نسخ التغريدة المصاغة",
    buttonCopyNewsText: "نسخ الخبر",
    buttonCopyTweetText: "نسخ التغريدة",
    tweetHeading: "تغريدة مصاغة",
    tweetCardTitle: "متحقق من الأخبار",
    copyVerificationAria: "نسخ نتيجة التحقق",
    copyResult: "نسخ النتيجة",
    copied: "تم النسخ!",
    checkBtnAria: "زر التحقق من الخبر",
    checking: "جاري التحقق…",
    checkNow: "تحقق الآن",
    composeNewsBtn: "صياغة خبر",
    composeTweetBtn: "صياغة تغريدة",
    composingNews: "جاري صياغة الخبر…",
    composingTweet: "جاري صياغة التغريدة…",
    heroLine: null,
    loaderLine: "محرك الذكاء الاصطناعي يعمل… تجميع الأدلة، مطابقة الحقائق، وتكوين الحكم.",
  },
  english: {
    logoAlt: "University Logo",
    title: "Fact Checker",
    inputLabel: "Enter the news headline to fact-check",
    placeholder: "Example: The US President announced a new decision...",
    ariaInput: "Text input for fact-checking",
    errorNoQuery: "Please enter the news first.",
    errorFetch: "Failed to get result",
    errorUnexpected: "An unexpected error occurred.",
    status: "Status",
    analysis: "Analysis",
    sources: "Sources",
    none: "None",
    noSources: "No sources available.",
    generatedNews: "Generated News Article",
    copyGeneratedNewsAria: "Copy generated news article",
    copyGeneratedTweetAria: "Copy generated tweet",
    buttonCopyNewsText: "Create Article",
    buttonCopyTweetText: "X Tweet",
    tweetHeading: "Generated Tweet",
    tweetCardTitle: "Fact Checker",
    copyVerificationAria: "Copy verification result",
    copyResult: "Copy Result",
    copied: "Copied!",
    checkBtnAria: "Fact check button",
    checking: "Checking...",
    checkNow: "Check Now",
    composeNewsBtn: "Compose News",
    composeTweetBtn: "Compose Tweet",
    composingNews: "Composing news…",
    composingTweet: "Composing tweet…",
    heroLine: null,
    loaderLine: "AI engine is working… gathering evidence, matching facts, and forming the verdict.",
  }
};

// ======= Helpers =======
const urlRegex =
  /((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?)/gi;

function toAbsoluteUrl(maybeUrl) {
  if (!/^https?:\/\//i.test(maybeUrl)) return `https://${maybeUrl}`;
  return maybeUrl;
}

function getDomain(u) {
  try {
    const url = new URL(toAbsoluteUrl(u));
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return (u || "").replace(/^https?:\/\//i, "").split("/")[0].replace(/^www\./i, "");
  }
}

function faviconUrl(domain) {
  const d = (domain || "").trim();
  if (!d) return "";
  return `https://icons.duckduckgo.com/ip3/${d}.ico`;
}

// ========= New: List-aware renderer (fix numbers mess) =========
const ENUM_LINE = /^\s*([0-9\u0660-\u0669]+)[\.\):\-]\s+(.+)$/; // 1. , 1) , ١. , ١)
function splitIntoBlocks(text) {
  // يقسم النص إلى بلوكات: فقرة عادية أو قائمة مرقّمة متتالية
  const lines = (text || "").split(/\r?\n/);
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // تخطّي الأسطر الفارغة المتتالية
    if (!line.trim()) {
      i++;
      continue;
    }

    // لو بداية قائمة مرقّمة
    if (ENUM_LINE.test(line)) {
      const items = [];
      while (i < lines.length && ENUM_LINE.test(lines[i])) {
        const m = lines[i].match(ENUM_LINE);
        items.push(m[2]); // المحتوى بدون الرقم، هنربطه بعدين باللينكات
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // غير ذلك: اجمع لحد سطر فاضي أو لحد قائمة جديدة
    const buff = [];
    while (i < lines.length && lines[i].trim() && !ENUM_LINE.test(lines[i])) {
      buff.push(lines[i]);
      i++;
    }
    blocks.push({ type: "p", text: buff.join(" ") });
  }
  return blocks;
}

// يحوّل نص إلى عناصر React مع أزرار للروابط داخل الفقرات/العناصر
function linkifyText(txt) {
  if (!txt) return null;

  // 1) Markdown links [label](url)
  const md = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const parts = [];
  let last = 0, m;

  while ((m = md.exec(txt)) !== null) {
    const [full, label, href] = m;
    const start = m.index;
    if (start > last) parts.push(txt.slice(last, start));
    parts.push(<LinkChip key={`md-${start}`} href={href} label={label} />);
    last = start + full.length;
  }
  if (last < txt.length) parts.push(txt.slice(last));

  // 2) Raw URLs
  const out = [];
  parts.forEach((p, idx) => {
    if (typeof p !== "string") { out.push(p); return; }
    let l = 0, hit;
    while ((hit = urlRegex.exec(p)) !== null) {
      const raw = hit[0], s = hit.index;
      if (s > l) out.push(p.slice(l, s));
      out.push(<LinkChip key={`url-${idx}-${s}`} href={toAbsoluteUrl(raw)} />);
      l = s + raw.length;
    }
    if (l < p.length) out.push(p.slice(l));
  });

  return out.map((node, i) => typeof node === "string" ? <span key={`t-${i}`}>{node}</span> : node);
}

function renderTalkSmart(talk) {
  const blocks = splitIntoBlocks(talk || "");
  return blocks.map((b, idx) => {
    if (b.type === "ol") {
      return (
        <ol
          key={`b-${idx}`}
          dir="rtl"
          className="nice-ol ms-4 my-3 grid gap-2"
        >
          {b.items.map((it, j) => (
            <li key={`it-${j}`} className="leading-8 pe-2">
              {linkifyText(it)}
            </li>
          ))}
        </ol>
      );
    }
    // فقرة عادية
    return (
      <p key={`b-${idx}`} className="leading-8 my-2">
        {linkifyText(b.text)}
      </p>
    );
  });
}

// ======= Component =======
function AINeonFactChecker() {
  const { isArabic, language } = useLanguage();
  const T = TRANSLATIONS[language] || TRANSLATIONS.english;
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [composingNews, setComposingNews] = useState(false);
  const [composingTweet, setComposingTweet] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 400) + 'px';
    }
  }, [query]);

  async function handleCheck() {
    setErr("");
    setResult(null);
    const q = query.trim();
    if (!q) {
      setErr(T.errorNoQuery);
      return;
    }

    setLoading(true);
    try {
      console.log("🔍 Sending request to:", FACT_CHECK_URL);
      console.log("📝 Request body:", { 
        query: q
      });
      
      const res = await fetch(FACT_CHECK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: q
        }),
      });

      console.log("📡 Response status:", res.status, res.statusText);
      
      const text = await res.text();
      console.log("📄 Response text:", text);
      
      if (!text.trim()) {
        throw new Error("Server returned empty response");
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log("✅ Parsed JSON data:", data);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("Response text:", text);
        throw new Error("Invalid JSON response from server");
      }

      // إذا كان ok = false، اعرض رسالة الخطأ من الـ API
      if (!data?.ok) {
        throw new Error(data?.error || T.errorFetch);
      }

      setResult({
        case: data.case || "غير متوفر",
        talk: data.talk || "لا يوجد تفسير.",
        sources: Array.isArray(data.sources) ? data.sources : [],
        news_article: data.news_article || null,
        x_tweet: data.x_tweet || null,
        source_statistics: data.source_statistics || null,
      });
      
    } catch (e) {
      console.error("Error in handleCheck:", e);
      setErr(e.message || T.errorUnexpected);
    } finally {
      setLoading(false);
    }
  }

  async function handleComposeNews() {
    if (!result) return;
    
    setComposingNews(true);
    setErr("");
    try {
      const requestBody = {
        claim_text: query.trim(),
        case: result.case,
        talk: result.talk,
        sources: result.sources,
        lang: language === "arabic" ? "ar" : language === "french" ? "fr" : "en"
      };
      
      console.log("📰 Composing news via:", COMPOSE_NEWS_URL);
      console.log("📝 News request body:", requestBody);
      
      const res = await fetch(COMPOSE_NEWS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("📡 News response status:", res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      console.log("📄 News response text:", text);
      
      if (!text.trim()) {
        throw new Error("Server returned empty response");
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log("✅ News parsed JSON data:", data);
      } catch (parseError) {
        console.error("JSON Parse Error in compose news:", parseError);
        console.error("Response text:", text);
        throw new Error("Invalid JSON response from server");
      }
      
      if (data?.ok && data?.news_article) {
        setResult(prev => ({
          ...prev,
          news_article: data.news_article
        }));
      } else {
        throw new Error(data?.error || T.errorFetch);
      }
    } catch (e) {
      console.error("Error in handleComposeNews:", e);
      setErr(e.message || T.errorUnexpected);
    } finally {
      setComposingNews(false);
    }
  }

  async function handleComposeTweet() {
    if (!result) return;
    
    setComposingTweet(true);
    setErr("");
    try {
      const requestBody = {
        claim_text: query.trim(),
        case: result.case,
        talk: result.talk,
        sources: result.sources,
        lang: language === "arabic" ? "ar" : language === "french" ? "fr" : "en"
      };
      
      console.log("🐦 Composing tweet via:", COMPOSE_TWEET_URL);
      console.log("📝 Tweet request body:", requestBody);
      
      const res = await fetch(COMPOSE_TWEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("📡 Tweet response status:", res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      console.log("📄 Tweet response text:", text);
      
      if (!text.trim()) {
        throw new Error("Server returned empty response");
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log("✅ Tweet parsed JSON data:", data);
      } catch (parseError) {
        console.error("JSON Parse Error in compose tweet:", parseError);
        console.error("Response text:", text);
        throw new Error("Invalid JSON response from server");
      }
      
      if (data?.ok && data?.x_tweet) {
        setResult(prev => ({
          ...prev,
          x_tweet: data.x_tweet
        }));
      } else {
        throw new Error(data?.error || T.errorFetch);
      }
    } catch (e) {
      console.error("Error in handleComposeTweet:", e);
      setErr(e.message || T.errorUnexpected);
    } finally {
      setComposingTweet(false);
    }
  }

  function copyAll() {
    if (!result) return;
    let text =
      `${T.status}: ${result.case}\n\n` +
      `${T.analysis}: ${result.talk}\n\n` +
      `${T.sources}:\n` +
      (result.sources?.length
        ? result.sources.map((s) => `- ${s.title || getDomain(s?.url)} — ${s.url}`).join("\n")
        : `- ${T.none}`);
    
    if (result.news_article) {
      text += `\n\n${T.generatedNews}:\n${result.news_article}`;
    }
    
    if (result.x_tweet) {
      text += `\n\n${T.tweetHeading}:\n${result.x_tweet}`;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      // Show success feedback
      const originalText = T.copyResult;
      const button = document.querySelector('[aria-label*="نسخ"]') || document.querySelector('[aria-label*="Copy"]');
      if (button) {
        const originalContent = button.textContent;
        button.textContent = T.copied;
        button.style.background = 'linear-gradient(to right, #10b981, #059669)';
        setTimeout(() => {
          button.textContent = originalContent;
          button.style.background = '';
        }, 2000);
      }
    });
  }

  const renderedTalk = useMemo(() => renderTalkSmart(result?.talk || ""), [result?.talk]);

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="min-h-screen relative overflow-hidden transition-colors duration-500 px-3 sm:px-0 bg-[#05070e] text-white">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full blur-3xl bg-[radial-gradient(circle_at_center,_rgba(88,101,242,0.18),_transparent_60%)] animate-slow-pulse" />
        <div className="absolute -bottom-1/4 -left-1/4 w-[55vw] h-[55vw] rounded-full blur-3xl bg-[radial-gradient(circle_at_center,_rgba(24,182,155,0.18),_transparent_60%)] animate-slow-pulse delay-300" />
      </div>

      {/* Language Toggle */}
      <div
        className="absolute z-20 flex sm:flex-col flex-row gap-2 sm:gap-4 top-2 left-2 sm:top-6 sm:left-6 scale-75 sm:scale-100"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0.25rem)' }}
      >
        <LanguageToggle />
      </div>

      {/* AI orb / character */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8 }}
        className="mx-auto pt-16 sm:pt-10 flex flex-col items-center gap-4"
      >
        <motion.div
          className="relative mb-4"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* AI Glow Effect */}
          <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-teal-500/15 blur-2xl animate-pulse" />
          <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-teal-400/20 blur-xl animate-pulse delay-300" />
          
          {/* Circular Logo Container */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36 mx-auto">
            {/* Rotating Stars Orbit */}
            <div className="absolute inset-0">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={`star-${i}`}
                  className="absolute w-2 h-2"
                style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: '0 0',
                    transform: `rotate(${i * 30}deg) translateX(60px) translateY(-4px)`
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 8,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.1
                  }}
                >
                  <motion.div
                    className="w-2 h-2 bg-gradient-to-r from-yellow-300 to-yellow-100 rounded-full shadow-lg"
                    animate={{
                      scale: [0.8, 1.2, 0.8],
                      opacity: [0.6, 1, 0.6],
                      boxShadow: [
                        '0 0 8px rgba(255, 255, 255, 0.3)',
                        '0 0 16px rgba(255, 255, 255, 0.6)',
                        '0 0 8px rgba(255, 255, 255, 0.3)'
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
            ))}
          </div>

            {/* Inner Rotating Stars */}
            <div className="absolute inset-4">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`inner-star-${i}`}
                  className="absolute w-1.5 h-1.5"
                style={{
                    left: '50%',
                    top: '50%',
                    transformOrigin: '0 0',
                    transform: `rotate(${i * 45}deg) translateX(40px) translateY(-3px)`
                  }}
                  animate={{ rotate: -360 }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.15
                  }}
                >
                  <motion.div
                    className="w-1.5 h-1.5 bg-gradient-to-r from-blue-300 to-cyan-200 rounded-full"
                    animate={{
                      scale: [0.5, 1, 0.5],
                      opacity: [0.4, 0.9, 0.4]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.3,
                      ease: "easeInOut"
                    }}
                  />
                </motion.div>
            ))}
          </div>

            {/* Circular Logo */}
            <motion.div
              className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/30 shadow-2xl"
              whileHover={{ 
                scale: 1.05,
                rotateY: 10,
                rotateX: 5
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20 
              }}
            >
              {/* Holographic Overlay */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-60" />
              
              {/* Logo Image */}
              <motion.img
                src={joinLogo}
                alt={T.logoAlt}
                className="w-full h-full object-cover select-none"
                draggable="false"
                whileHover={{ 
                  scale: 1.02,
                  filter: "brightness(1.1) saturate(1.2)"
                }}
                transition={{ 
                  type: "spring", 
                  stiffness: 400, 
                  damping: 25 
                }}
              />
              
              {/* Pulsing Ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-white/40"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
            
            {/* Outer Energy Rings */}
            <div className="absolute -inset-2 rounded-full border border-white/20 animate-spin-slow" />
            <div className="absolute -inset-4 rounded-full border border-white/10 animate-spin-reverse" />
            <div className="absolute -inset-6 rounded-full border border-white/5 animate-spin-slow" />
        </div>
        </motion.div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-center">
          {T.title}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-center max-w-[90vw] sm:max-w-xl md:max-w-2xl text-white/70">
          {language === 'arabic' ? (
            <>
              أدخل الخبر، وسنبحث ونحلل ونرجّع لك <span className="text-teal-300">{TRANSLATIONS.arabic.status}</span>،
              <span className="text-indigo-300"> {TRANSLATIONS.arabic.analysis}</span>، و
              <span className="text-fuchsia-300"> {TRANSLATIONS.arabic.sources}</span>
            </>
          ) : (
            <>
              Enter your claim, and we'll search, analyze, and return the <span className="text-teal-300">{TRANSLATIONS.english.status.toLowerCase()}</span>,
              <span className="text-indigo-300"> {TRANSLATIONS.english.analysis.toLowerCase()}</span>, and
              <span className="text-fuchsia-300"> {TRANSLATIONS.english.sources.toLowerCase()}</span>
            </>
          )}
        </p>
      </motion.div>

      {/* Main card */}
      <div className="relative z-10 mx-auto mt-6 sm:mt-8 w-full max-w-3xl p-1 rounded-2xl bg-gradient-to-r from-indigo-500/30 via-fuchsia-500/30 to-teal-500/30">
        <div className="rounded-2xl backdrop-blur-xl p-4 sm:p-6 bg-[#0a0f1c]/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,.06)]">
          {/* Input */}
          <div className="flex flex-col gap-3">
            <label className="text-sm text-white/70">
              {T.inputLabel}
            </label>
            <motion.textarea
              ref={textareaRef}
              className="min-h-[60px] max-h-[400px] rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 transition-all duration-300 resize-none bg-[#0b1327] border border-white/20 focus:ring-indigo-400/60 shadow-[0_0_20px_rgba(99,102,241,.08)] text-white placeholder-white/60 overflow-y-auto"
              placeholder={T.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleCheck();
                }
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                e.target.style.boxShadow = '0 0 30px rgba(99, 102, 241, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.boxShadow = '0 0 20px rgba(99, 102, 241, 0.08)';
              }}
              aria-label={T.ariaInput}
              aria-describedby="input-help"
              rows={1}
              whileFocus={{ 
                scale: 1.01,
                transition: { duration: 0.2 }
              }}
            />

            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <motion.button
                onClick={handleCheck}
                disabled={loading}
                className="relative px-5 py-3 sm:px-8 sm:py-4 rounded-2xl font-semibold sm:font-bold text-base sm:text-lg overflow-hidden transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group focus:outline-none focus:ring-4 focus:ring-indigo-400/50 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_20px_40px_rgba(99,102,241,.4)]"
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: '0_25px_50px_rgba(99,102,241,.6)'
                }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                aria-label={T.checkBtnAria}
                tabIndex={0}
              >
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                
                {/* Button content */}
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <motion.div
                        className="relative w-5 h-5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        {/* Outer spinning ring */}
                        <motion.div
                          className="absolute inset-0 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        {/* Inner pulsing dot */}
                        <motion.div
                          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2"
                          animate={{ 
                            scale: [1, 1.5, 1],
                            opacity: [0.5, 1, 0.5]
                          }}
                          transition={{ 
                            duration: 1.5, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                        />
                      </motion.div>
                      <motion.span
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        {T.checking}
                      </motion.span>
                    </>
                  ) : (
                    <>
                      <motion.span
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        ✅
                      </motion.span>
                      <span>{T.checkNow}</span>
                    </>
                  )}
                </span>
                
                {/* Glow effect */}
                <div className="absolute -inset-1 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
              </motion.button>

              {result && (
                <motion.button
                  onClick={copyAll}
                  className="px-5 py-2.5 rounded-xl transition font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-white/10 hover:bg-white/15 border border-white/10"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={T.copyVerificationAria}
                  tabIndex={0}
                >
                  {T.copyResult}
                </motion.button>
              )}
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {err && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mt-6 rounded-2xl px-6 py-5 bg-gradient-to-br from-red-950/80 via-red-900/70 to-red-950/80 border-2 border-red-700/70 shadow-[0_8px_32px_rgba(185,28,28,0.4)]"
                role="alert"
                aria-live="polite"
                dir={isArabic ? 'rtl' : 'ltr'}
              >
                <div className="flex items-center gap-4">
                  <motion.span 
                    className="text-4xl flex-shrink-0"
                    animate={{ 
                      scale: [1, 1.15, 1],
                      rotate: [0, -10, 10, 0]
                    }}
                    transition={{ 
                      duration: 2.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                  >
                    ⚠️
                  </motion.span>
                  <p className="text-white/95 font-medium text-[15px] sm:text-base leading-loose flex-1">
                    {err}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loader */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6">
                <ManufacturingLoader />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-8 grid gap-6"
              >
                {/* Case */}
                <motion.div 
                  className="rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-emerald-600/90 to-teal-500/80 shadow-[0_15px_50px_rgba(16,185,129,.4)]"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <NeonDot color="rgba(16,185,129,1)" />
                      <h3 className="text-2xl font-extrabold">{T.status}</h3>
                    </div>
                    <Badge>{result.case}</Badge>
                  </div>
                </motion.div>

                {/* Talk */}
                <motion.div 
                  className="rounded-2xl p-6 sm:p-7 bg-white/8 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,.2)]"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <NeonDot color="rgba(99,102,241,1)" />
                    <h3 className="text-2xl font-extrabold">{T.analysis}</h3>
                  </div>
                  <div className="prose max-w-none leading-8 text-base prose-invert">
                    {renderedTalk}
                  </div>
                </motion.div>

                {/* Source Statistics */}
                {result.source_statistics && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <SourceStatistics 
                      statistics={result.source_statistics} 
                      language={language}
                    />
                  </motion.div>
                )}

                {/* Sources */}
                <motion.div 
                  className="rounded-2xl p-6 sm:p-7 bg-white/8 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,.2)]"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <NeonDot color="rgba(56,189,248,1)" />
                    <h3 className="text-2xl font-extrabold">{T.sources}</h3>
                  </div>

                  {result.sources?.length ? (
                    <ul className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                      {result.sources.map((s, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <LinkChip href={s?.url} label={s?.title} big />
                        </motion.li>
                      ))}
                    </ul>
                  ) : (
                    <motion.p 
                      className="text-center py-8 text-white/60"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      {T.noSources}
                    </motion.p>
                  )}
                </motion.div>

                {/* Compose Actions */}
                <motion.div 
                  className="flex gap-3 flex-wrap justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {!result.news_article && (
                    <motion.button
                      onClick={handleComposeNews}
                      disabled={composingNews}
                      className="relative overflow-hidden group px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 text-white shadow-[0_8px_32px_rgba(16,185,129,.4)] hover:shadow-[0_12px_40px_rgba(16,185,129,.6)]"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {composingNews ? (
                          <>
                            <motion.div
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span>{T.composingNews}</span>
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M19 3H8a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v8a3 3 0 0 0 3 3h13a3 3 0 0 0 3-3V5a2 2 0 0 0-2-2Zm-3 4h3v2h-3V7Zm-8 0h6v2H8V7Zm0 4h11v2H8v-2Zm0 4h11v2H8v-2ZM5 9h1v8a1 1 0 0 1-1-1V9Z"/>
                            </svg>
                            <span>{T.composeNewsBtn}</span>
                          </>
                        )}
                      </span>
                    </motion.button>
                  )}
                  
                  {!result.x_tweet && (
                    <motion.button
                      onClick={handleComposeTweet}
                      disabled={composingTweet}
                      className="relative overflow-hidden group px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400/50 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_8px_32px_rgba(29,161,242,.4)] hover:shadow-[0_12px_40px_rgba(29,161,242,.6)]"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        {composingTweet ? (
                          <>
                            <motion.div
                              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                            <span>{T.composingTweet}</span>
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <span>{T.composeTweetBtn}</span>
                          </>
                        )}
                      </span>
                    </motion.button>
                  )}
                </motion.div>

                {/* Generated News Article */}
                {result.news_article && (
                  <motion.div 
                    className="rounded-2xl p-6 sm:p-7 bg-white/8 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,.2)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <NeonDot color="rgba(34,197,94,1)" />
                        <h3 className="text-2xl font-extrabold">{T.generatedNews}</h3>
                      </div>
                      <motion.button
                        onClick={() => {
                          navigator.clipboard.writeText(result.news_article).then(() => {
                            const button = event.target;
                            const originalText = button.textContent;
                            button.textContent = `${T.copied} ✓`;
                            button.style.background = 'linear-gradient(135deg, #10b981, #059669, #047857)';
                            setTimeout(() => {
                              button.textContent = originalText;
                              button.style.background = '';
                            }, 2000);
                          });
                        }}
                        className="relative overflow-hidden group px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 text-white shadow-[0_8px_32px_rgba(16,185,129,.4)] hover:shadow-[0_12px_40px_rgba(16,185,129,.6)]"
                        whileHover={{ 
                          scale: 1.05,
                          rotateX: 5,
                          y: -2
                        }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={T.copyGeneratedNewsAria}
                      >
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-emerald-500 via-green-400 to-teal-400" />
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        
                        {/* Newspaper icon and text */}
                        <span className="relative z-10 flex items-center gap-2">
                          <motion.svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-white"
                            animate={{ 
                              rotate: [0, 5, -5, 0],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ 
                              duration: 2, 
                              repeat: Infinity, 
                              repeatDelay: 3 
                            }}
                            aria-hidden="true"
                          >
                            <path d="M19 3H8a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v8a3 3 0 0 0 3 3h13a3 3 0 0 0 3-3V5a2 2 0 0 0-2-2Zm-3 4h3v2h-3V7Zm-8 0h6v2H8V7Zm0 4h11v2H8v-2Zm0 4h11v2H8v-2ZM5 9h1v8a1 1 0 0 1-1-1V9Z"/>
                          </motion.svg>
                          <span>{T.buttonCopyNewsText}</span>
                        </span>
                        
                        {/* Glow effect */}
                        <div className="absolute -inset-1 rounded-2xl blur-md opacity-0 group-hover:opacity-70 transition-opacity duration-300 bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400" />
                        
                        {/* Floating particles */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[...Array(3)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute w-1 h-1 bg-white/60 rounded-full"
                              style={{
                                left: `${20 + i * 25}%`,
                                top: `${30 + i * 15}%`,
                              }}
                              animate={{
                                y: [-5, -15, -5],
                                opacity: [0, 1, 0],
                                scale: [0.5, 1, 0.5]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.3,
                                repeatDelay: 1
                              }}
                            />
                          ))}
                        </div>
                      </motion.button>
                    </div>
                    <div className="rounded-xl p-6 border-2 bg-[#0a0a0a] border-white/20">
                      <div className="prose max-w-none leading-8 text-base whitespace-pre-line prose-invert">
                        {result.news_article}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Generated Tweet */}
                {result.x_tweet && (
                  <motion.div 
                    className="rounded-2xl p-6 sm:p-7 bg-white/8 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,.2)]"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                  >
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-3">
                        <NeonDot color="rgba(59,130,246,1)" />
                        <h3 className="text-2xl font-extrabold">{T.tweetHeading}</h3>
                      </div>
                      <motion.button
                        onClick={() => {
                          navigator.clipboard.writeText(result.x_tweet).then(() => {
                            const button = event.target;
                            const originalText = button.textContent;
                            button.textContent = `${T.copied} ✓`;
                            button.style.background = 'linear-gradient(135deg, #1da1f2, #0d8bd9, #0570de)';
                            setTimeout(() => {
                              button.textContent = originalText;
                              button.style.background = '';
                            }, 2000);
                          });
                        }}
                        className="relative overflow-hidden group px-6 py-3 rounded-2xl font-bold text-sm transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400/50 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-[0_8px_32px_rgba(29,161,242,.4)] hover:shadow-[0_12px_40px_rgba(29,161,242,.6)]"
                        whileHover={{ 
                          scale: 1.05,
                          rotateX: -5,
                          y: -2
                        }}
                        whileTap={{ scale: 0.95 }}
                        aria-label={T.copyGeneratedTweetAria}
                      >
                        {/* Animated background gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-blue-500 via-sky-400 to-cyan-400" />
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -top-2 -left-2 w-[calc(100%+16px)] h-[calc(100%+16px)] bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        
                        {/* X/Twitter icon and text */}
                        <span className="relative z-10 flex items-center gap-2">
                          <motion.svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="text-white"
                            animate={{ 
                              rotate: [0, 5, -5, 0],
                              scale: [1, 1.1, 1]
                            }}
                            transition={{ 
                              duration: 2, 
                              repeat: Infinity, 
                              repeatDelay: 3 
                            }}
                          >
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </motion.svg>
                          <span>{T.buttonCopyTweetText}</span>
                        </span>
                        
                        {/* Glow effect */}
                        <div className="absolute -inset-1 rounded-2xl blur-md opacity-0 group-hover:opacity-70 transition-opacity duration-300 bg-gradient-to-r from-blue-400 via-sky-400 to-cyan-400" />
                        
                        {/* Flying tweet particles */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="absolute text-xs opacity-60"
                              style={{
                                left: `${15 + i * 20}%`,
                                top: `${25 + i * 10}%`,
                              }}
                              animate={{
                                x: [0, 10, 0],
                                y: [-3, -12, -3],
                                opacity: [0, 0.8, 0],
                                scale: [0.3, 0.8, 0.3]
                              }}
                              transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                delay: i * 0.4,
                                repeatDelay: 2
                              }}
                            >
                              {i % 2 === 0 ? '💬' : '🔄'}
                            </motion.div>
                          ))}
                        </div>
                        
                        {/* Pulsing border */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="absolute inset-0 rounded-2xl border-2 border-white/10 animate-pulse" />
                        </div>
                      </motion.button>
                    </div>
                    <div className="rounded-xl p-4 border-2 bg-[#0a0a0a] border-white/20">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                          F
                        </div>
                        <div>
                          <div className="font-bold text-white">
                            {T.tweetCardTitle}
                          </div>
                          <div className="text-sm text-white/60">
                            @factchecker
                          </div>
                        </div>
                      </div>
                      <div className="text-base leading-relaxed text-white">
                        {result.x_tweet}
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 mt-16">
        {/* Starry Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900">
          {/* Animated Stars */}
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0.3, 1, 0.3],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>
        
        <div className="relative bg-slate-900 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* JoinSoftWave Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">JS</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-200">JoinSoftWave</h3>
                </div>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Specialized AI development, cybersecurity services, and enterprise software solutions. We provide AI-powered fraud detection, predictive maintenance, and managed SOC services.
                </p>
                <div className="flex gap-3">
                  <motion.a
                    href="https://www.linkedin.com/company/join-softwave/?viewAsMember=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </motion.a>
                  <motion.a
                    href="https://www.facebook.com/joinsoftwave"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-blue-600 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </motion.a>
                  <motion.a
                    href="https://join-softwave.online/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-purple-600 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  </motion.a>
                  <motion.a
                    href="https://wa.me/201505858198"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center hover:bg-green-600 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                  </motion.a>
                </div>
              </div>

              {/* Services Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200">Services</h3>
                <ul className="space-y-2">
                  {['AI Fraud Detection', 'Predictive Maintenance', 'Managed SOC Services', 'Cloud Security Compliance', 'Intelligent Chatbots', 'Enterprise Software Development'].map((service) => (
                    <li key={service}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                        {service}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200">Company</h3>
                <ul className="space-y-2">
                  {['About Us', 'Our Team', 'Careers', 'Blog', 'Case Studies'].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200">Resources</h3>
                <ul className="space-y-2">
                  {['Documentation', 'API Reference', 'Support Center', 'Community'].map((resource) => (
                    <li key={resource}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
                        {resource}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Local styles for animations + ordered list */}
      <style>{`
        .animate-slow-pulse { animation: slowPulse 7s ease-in-out infinite; }
        .animate-orb-float { animation: orbFloat 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spinSlow 14s linear infinite; }
        .animate-spin-reverse { animation: spinReverse 12s linear infinite; }
        .animate-pulse-glow { animation: pulseGlow 4s ease-in-out infinite; }
        .animate-pulse-glow-delayed { animation: pulseGlow 4s ease-in-out infinite 1s; }
        .animate-float-particle { animation: floatParticle 3s ease-in-out infinite; }
        .animate-energy-line { animation: energyLine 2s ease-in-out infinite; }
        .animate-light-sweep { animation: lightSweep 3s ease-in-out infinite; }
        .animate-core-pulse { animation: corePulse 2s ease-in-out infinite; }
        .animate-data-stream { animation: dataStream 8s linear infinite; }
        
        @keyframes slowPulse { 
          0%, 100% { transform: scale(1); opacity: .9; } 
          50% { transform: scale(1.08); opacity: 1; } 
        }
        @keyframes orbFloat { 
          0%, 100% { transform: translateY(0px) scale(1); } 
          50% { transform: translateY(-10px) scale(1.05); } 
        }
        @keyframes spinSlow { 
          to { transform: rotate(360deg); } 
        }
        @keyframes spinReverse { 
          to { transform: rotate(-360deg); } 
        }
        @keyframes pulseGlow { 
          0%, 100% { 
            transform: scale(1); 
            opacity: 0.3; 
            filter: blur(8px);
          } 
          50% { 
            transform: scale(1.2); 
            opacity: 0.6; 
            filter: blur(12px);
          } 
        }
        @keyframes floatParticle { 
          0%, 100% { 
            transform: translateY(0px) translateX(0px) scale(1); 
            opacity: 0.6; 
          } 
          25% { 
            transform: translateY(-15px) translateX(5px) scale(1.2); 
            opacity: 1; 
          } 
          50% { 
            transform: translateY(-25px) translateX(-5px) scale(0.8); 
            opacity: 0.8; 
          } 
          75% { 
            transform: translateY(-10px) translateX(8px) scale(1.1); 
            opacity: 0.9; 
          } 
        }
        @keyframes energyLine { 
          0%, 100% { 
            transform: scaleY(0.3) rotate(var(--rotation, 0deg)); 
            opacity: 0.3; 
          } 
          50% { 
            transform: scaleY(1.2) rotate(var(--rotation, 0deg)); 
            opacity: 0.8; 
          } 
        }
        @keyframes lightSweep { 
          0% { 
            transform: translateX(-100%) rotate(0deg); 
            opacity: 0; 
          } 
          50% { 
            opacity: 1; 
          } 
          100% { 
            transform: translateX(100%) rotate(180deg); 
            opacity: 0; 
          } 
        }
        @keyframes corePulse { 
          0%, 100% { 
            transform: scale(1); 
            opacity: 0.6; 
          } 
          50% { 
            transform: scale(1.1); 
            opacity: 1; 
          } 
        }
        @keyframes dataStream { 
          0% { 
            transform: rotate(0deg) scale(1); 
            opacity: 0.3; 
          } 
          25% { 
            opacity: 0.6; 
          } 
          50% { 
            transform: rotate(180deg) scale(1.05); 
            opacity: 0.4; 
          } 
          75% { 
            opacity: 0.7; 
          } 
          100% { 
            transform: rotate(360deg) scale(1); 
            opacity: 0.3; 
          } 
        }

        /* Ordered list بترقيم عربي أنيق */
        .nice-ol {
          list-style: none;
          counter-reset: item;
          padding-inline-start: 0;
        }
        .nice-ol > li {
          counter-increment: item;
          position: relative;
          padding-right: 2.2em; /* مسافة الرقم */
        }
        .nice-ol > li::before {
          content: counter(item, arabic-indic) "‎. ";
          /* arabic-indic يعمل على معظم المتصفحات الحديثة */
          position: absolute;
          right: 0;
          top: 0;
          font-weight: 800;
          color: #7dd3fc; /* سماوي لطيف */
        }
      `}</style>
    </div>
  );
}

/* ----------------- Small UI atoms ----------------- */
function NeonDot({ color = "rgba(99,102,241,1)" }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ background: color, boxShadow: `0 0 18px ${color}` }}
    />
  );
}

function Badge({ children }) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-[2px] bg-black/25 border border-white/15">
      <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
      <span className="text-sm font-semibold">{children}</span>
    </span>
  );
}

function LinkChip({ href, label, big = false }) {
  if (!href) return null;
  const abs = toAbsoluteUrl(href);
  const domain = getDomain(abs);
  const text = label?.trim() || domain;

  return (
    <a
      href={abs}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2 rounded-xl transition px-3 py-2 ${big ? "w-full" : ""} border border-white/10 bg-[#0b1327]/40 hover:bg-[#0b1327]/60 shadow-[0_0_12px_rgba(56,189,248,.12)]`}
      title={text}
    >
      <img
        src={faviconUrl(domain)}
        alt=""
        className={`${big ? "w-6 h-6" : "w-4.5 h-4.5"} rounded`}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      <span className={`truncate ${big ? "text-[15px] font-semibold" : "text-sm"}`}>
        {text}
      </span>
      <span className="ms-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition text-sky-300">
        ↗
      </span>
    </a>
  );
}


function ManufacturingLoader() {
  const { language } = useLanguage();
  const T = TRANSLATIONS[language] || TRANSLATIONS.english;

  return (
    <div
      className="rounded-2xl p-5 overflow-hidden bg-[#0b1327]/50 border border-white/10"
    >
      <div className="flex items-center gap-3 mb-4">
        <NeonDot color="rgba(56,189,248,1)" />
        <p className="text-white/80">{T.loaderLine}</p>
      </div>
      <div
        className="relative h-12 overflow-hidden rounded-lg border bg-white/[.03] border-white/10"
      >
        <div className="absolute inset-0 flex items-center">
          <Conveyor />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <CodeBar />
        <CodeBar delay="0.35s" />
      </div>
    </div>
  );
}

function Conveyor() {
  return (
    <div className="relative w-full h-full">
      <div className="absolute inset-0 flex items-center">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="mx-2 h-3 w-12 rounded bg-gradient-to-r from-indigo-400/40 to-fuchsia-400/40 animate-move-right"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <style>{`
        .animate-move-right { animation: moveRight 1.8s linear infinite; }
        @keyframes moveRight {
          0% { transform: translateX(-120%); opacity: .6; }
          50% { opacity: 1; }
          100% { transform: translateX(120%); opacity: .6; }
        }
      `}</style>
    </div>
  );
}

function CodeBar({ delay = "0s" }) {
  return (
    <div className="relative h-24 rounded-lg p-3 overflow-hidden bg-black/20 border border-white/10">
      <div className="absolute inset-0 opacity-20" style={{ 
        backgroundImage: "linear-gradient(transparent 70%, rgba(255,255,255,.04) 0%)", 
        backgroundSize: "100% 20px" 
      }} />
      <div className="space-y-2 animate-code-flow" style={{ animationDelay: delay }}>
        <div className="h-2.5 rounded w-3/4 bg-white/20" />
        <div className="h-2.5 rounded w-1/2 bg-white/15" />
        <div className="h-2.5 rounded w-5/6 bg-white/20" />
        <div className="h-2.5 rounded w-2/3 bg-white/15" />
      </div>
      <style>{`
        .animate-code-flow { animation: codeFlow 1.6s ease-in-out infinite; }
        @keyframes codeFlow {
          0%,100% { transform: translateY(0px); opacity: .9; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Main App component with LanguageProvider
export default function App() {
  return (
      <LanguageProvider>
        <AINeonFactChecker />
      </LanguageProvider>
  );
}