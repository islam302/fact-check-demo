import React from 'react';
import { motion } from 'framer-motion';

const SourceStatistics = ({ statistics, language = 'arabic' }) => {
  if (!statistics) return null;

  const { 
    supporting_percentage, 
    opposing_percentage, 
    neutral_percentage, 
    total_sources, 
    supporting_count, 
    opposing_count, 
    neutral_count 
  } = statistics;

  // Translations
  const translations = {
    arabic: {
      title: "إحصائيات المصادر",
      supporting: "مؤيدة",
      opposing: "معارضة", 
      neutral: "محايدة",
      total: "إجمالي المصادر",
      sources: "مصدر",
      sources_plural: "مصادر"
    },
    english: {
      title: "Source Statistics",
      supporting: "Supporting",
      opposing: "Opposing",
      neutral: "Neutral", 
      total: "Total Sources",
      sources: "source",
      sources_plural: "sources"
    }
  };

  const T = translations[language] || translations.arabic;

  // Color schemes for different categories
  const getColorScheme = (type) => {
    switch (type) {
      case 'supporting':
        return {
          bg: 'from-emerald-500/20 to-green-400/20',
          border: 'border-emerald-400/30',
          text: 'text-emerald-300',
          icon: '✅',
          bar: 'from-emerald-500 to-green-400'
        };
      case 'opposing':
        return {
          bg: 'from-red-500/20 to-rose-400/20',
          border: 'border-red-400/30',
          text: 'text-red-300',
          icon: '❌',
          bar: 'from-red-500 to-rose-400'
        };
      case 'neutral':
        return {
          bg: 'from-gray-500/20 to-slate-400/20',
          border: 'border-gray-400/30',
          text: 'text-gray-300',
          icon: '⚪',
          bar: 'from-gray-500 to-slate-400'
        };
      default:
        return {
          bg: 'from-blue-500/20 to-cyan-400/20',
          border: 'border-blue-400/30',
          text: 'text-blue-300',
          icon: '📊',
          bar: 'from-blue-500 to-cyan-400'
        };
    }
  };

  const StatCard = ({ type, percentage, count, label, delay = 0 }) => {
    const colors = getColorScheme(type);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ 
          duration: 0.6, 
          delay,
          ease: "easeOut"
        }}
        className={`relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br ${colors.bg} border ${colors.border} backdrop-blur-sm`}
      >
        {/* Animated background glow */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0`}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity, delay }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <motion.span
                className="text-2xl"
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: delay + 0.5 
                }}
              >
                {colors.icon}
              </motion.span>
              <div>
                <h3 className={`text-lg font-bold ${colors.text}`}>
                  {label}
                </h3>
                <p className="text-sm text-white/60">
                  {count} {count === 1 ? T.sources : T.sources_plural}
                </p>
              </div>
            </div>
            
            {/* Percentage badge */}
            <motion.div
              className={`px-3 py-1 rounded-full bg-gradient-to-r ${colors.bar} text-white font-bold text-lg`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.3, type: "spring", stiffness: 200 }}
            >
              {percentage.toFixed(1)}%
            </motion.div>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${colors.bar} rounded-full`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ 
                duration: 1.2, 
                delay: delay + 0.5,
                ease: "easeOut"
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ 
                  duration: 1.5, 
                  delay: delay + 1,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
              />
            </motion.div>
          </div>

          {/* Floating particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className={`absolute w-1 h-1 ${colors.text.replace('text-', 'bg-')} rounded-full`}
                style={{
                  left: `${20 + i * 30}%`,
                  top: `${30 + i * 20}%`,
                }}
                animate={{
                  y: [-5, -15, -5],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: delay + i * 0.3,
                  repeatDelay: 1
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="rounded-2xl p-6 sm:p-7 bg-white/8 border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,.2)]"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.div
          className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <h3 className="text-2xl font-extrabold text-white">
          {T.title}
        </h3>
        <motion.div
          className="ml-auto px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-400/20 border border-blue-400/30"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
        >
          <span className="text-blue-300 font-semibold">
            {total_sources} {total_sources === 1 ? T.sources : T.sources_plural}
          </span>
        </motion.div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          type="supporting"
          percentage={supporting_percentage}
          count={supporting_count}
          label={T.supporting}
          delay={0.1}
        />
        
        <StatCard
          type="opposing"
          percentage={opposing_percentage}
          count={opposing_count}
          label={T.opposing}
          delay={0.2}
        />
        
        <StatCard
          type="neutral"
          percentage={neutral_percentage}
          count={neutral_count}
          label={T.neutral}
          delay={0.3}
        />
      </div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.6 }}
        className="mt-6 p-4 rounded-xl bg-gradient-to-r from-slate-800/30 to-slate-700/30 border border-white/10"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">
            {language === 'arabic' ? 'التحليل الإجمالي:' : 'Overall Analysis:'}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-emerald-300 font-semibold">
              {supporting_percentage.toFixed(1)}% {language === 'arabic' ? 'مؤيدة' : 'Supporting'}
            </span>
            <span className="text-red-300 font-semibold">
              {opposing_percentage.toFixed(1)}% {language === 'arabic' ? 'معارضة' : 'Opposing'}
            </span>
            <span className="text-gray-300 font-semibold">
              {neutral_percentage.toFixed(1)}% {language === 'arabic' ? 'محايدة' : 'Neutral'}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SourceStatistics;
