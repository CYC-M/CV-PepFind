import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Language } from '@/locales';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { language, setLanguage, languages, t } = useI18n();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');

  const themeOptions = [
    { value: 'light', label: t('settings.lightMode'), icon: Sun },
    { value: 'dark', label: t('settings.darkMode'), icon: Moon },
    { value: 'system', label: t('settings.systemMode'), icon: Monitor },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background border border-border/50 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="border-b border-border/30 pb-4">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-500" />
              <DialogTitle className="text-lg font-semibold">{t('settings.title')}</DialogTitle>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-3 bg-background border border-border/30">
              <TabsTrigger value="general" className="data-[state=active]:bg-emerald-500/10">
                {t('settings.general')}
              </TabsTrigger>
              <TabsTrigger value="account" className="data-[state=active]:bg-emerald-500/10">
                {t('settings.account')}
              </TabsTrigger>
              <TabsTrigger value="about" className="data-[state=active]:bg-emerald-500/10">
                {t('settings.about')}
              </TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait">
              {/* General Tab */}
              <TabsContent value="general" className="space-y-6 mt-6">
                <motion.div
                  key="general"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Theme Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground/80">{t('settings.theme')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {themeOptions.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => {
                        // Theme change will be implemented in next phase
                        console.log('Theme change to:', value);
                      }}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                            theme === value
                              ? 'border-emerald-500 bg-emerald-500/10'
                              : 'border-border/30 hover:border-border/50 bg-background'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-xs font-medium">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground/80">{t('settings.language')}</label>
                    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                      <SelectTrigger className="bg-background border-border/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
                            <span className="flex items-center gap-2">
                              {lang.nativeName} ({lang.name})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account" className="space-y-6 mt-6">
                <motion.div
                  key="account"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-lg bg-background border border-border/30">
                    <p className="text-sm text-foreground/60">{t('settings.account')} - Coming soon</p>
                  </div>
                </motion.div>
              </TabsContent>

              {/* About Tab */}
              <TabsContent value="about" className="space-y-6 mt-6">
                <motion.div
                  key="about"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-sm font-medium text-emerald-400">CV-PepFind</p>
                      <p className="text-xs text-foreground/60 mt-1">{t('common.tagline')}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-background border border-border/30">
                      <p className="text-xs text-foreground/60">{t('settings.version')}: 1.0.0</p>
                      <p className="text-xs text-foreground/60 mt-2">{t('settings.copyright')}</p>
                    </div>
                  </div>
                </motion.div>
              </TabsContent>
            </AnimatePresence>
          </Tabs>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border/30">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="border-border/30 hover:bg-background/50"
            >
              {t('common.close')}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
