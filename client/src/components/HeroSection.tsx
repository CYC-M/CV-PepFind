import React, { useState, useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted?: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  const { t } = useI18n();
  const [selectedPrompt, setSelectedPrompt] = useState(0);

  const prompts = [
    t('hero.prompt1'),
    t('hero.prompt2'),
    t('hero.prompt3'),
    t('hero.prompt4'),
    t('hero.prompt5'),
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setSelectedPrompt((prev) => (prev + 1) % prompts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [prompts.length]);

  return (
    <div className="h-full flex flex-col items-center justify-center px-4 text-center">
      {/* Main Greeting */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 flex items-center justify-center border border-emerald-500/30 mx-auto mb-6 shadow-lg shadow-emerald-500/20">
          <Sparkles className="w-12 h-12 text-emerald-400" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-4xl md:text-5xl font-bold text-foreground mb-3"
      >
        {t('hero.greeting')}
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-lg text-foreground/60 mb-12 max-w-2xl"
      >
        {t('hero.subtitle')}
      </motion.p>

      {/* Rotating Prompts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mb-12 h-16 flex items-center justify-center"
      >
        <motion.div
          key={selectedPrompt}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-emerald-300">{prompts[selectedPrompt]}</span>
          </div>
        </motion.div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="flex gap-4 flex-col sm:flex-row"
      >
        <button
          onClick={onGetStarted}
          className="group flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300 hover:scale-105"
        >
          {t('hero.getStarted')}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </button>
        <button className="px-6 py-3 border border-border/50 text-foreground font-semibold rounded-lg hover:bg-background/50 transition-all duration-300">
          {t('hero.learnMore')}
        </button>
      </motion.div>

      {/* Prompt Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-12 flex gap-2"
      >
        {prompts.map((_, index) => (
          <button
            key={index}
            onClick={() => setSelectedPrompt(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === selectedPrompt
                ? 'bg-emerald-400 w-6'
                : 'bg-border/50 hover:bg-border'
            }`}
          />
        ))}
      </motion.div>
    </div>
  );
}
