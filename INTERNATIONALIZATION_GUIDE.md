# CV-PepFind 品牌重塑与国际化集成指南

## 已完成的工作

### 1. i18n 国际化系统（8语言支持）
✅ **位置**: `client/src/locales/`
- `en.json` - 英文（默认）
- `zh.json` - 中文简体
- `es.json` - 西班牙语
- `ar.json` - 阿拉伯语
- `fr.json` - 法语
- `pt.json` - 葡萄牙牙语
- `ru.json` - 俄语
- `ja.json` - 日语
- `index.ts` - 语言配置与翻译函数

### 2. I18n Context（全局语言状态管理）
✅ **位置**: `client/src/contexts/I18nContext.tsx`
- 提供 `useI18n()` Hook
- 支持 localStorage 持久化语言设置
- 自动加载用户上次选择的语言

### 3. 优雅设置面板
✅ **位置**: `client/src/components/SettingsPanel.tsx`
- 三个选项卡：General（主题+语言）、Account、About
- 流畅的 Framer Motion 动画过渡
- 高端极简设计（类似 ChatGPT/Gemini）
- 实时语言切换

### 4. Hero 区域重设计
✅ **位置**: `client/src/components/HeroSection.tsx`
- 动态问候文本
- 5个随机启发式提示（自动轮换）
- 优雅的 CTA 按钮
- 指示器导航

## 集成步骤

### 第1步：在 App.tsx 中添加 I18nProvider
```tsx
import { I18nProvider } from "./contexts/I18nContext";

function App() {
  return (
    <ErrorBoundary>
      <I18nProvider>  {/* 添加此行 */}
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}
```

### 第2步：在 Home.tsx 中集成设置面板和 Hero 区域
```tsx
import { SettingsPanel } from "@/components/SettingsPanel";
import { HeroSection } from "@/components/HeroSection";

export default function Home() {
  const [showSettings, setShowSettings] = useState(false);
  
  // ... 其他代码
  
  return (
    <>
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
      {/* 在顶部导航中添加设置按钮 */}
      <button onClick={() => setShowSettings(true)}>
        <Settings className="w-3.5 h-3.5" />
      </button>
      
      {/* 在欢迎屏幕中使用 Hero 区域 */}
      {!currentSession && <HeroSection onGetStarted={() => {}} />}
    </>
  );
}
```

### 第3步：使用 useI18n Hook 进行翻译
```tsx
import { useI18n } from "@/contexts/I18nContext";

function MyComponent() {
  const { t, language, setLanguage } = useI18n();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>当前语言: {language}</p>
    </div>
  );
}
```

## 品牌统一更新

### 标题更新
- ❌ 旧：`AI智能多肽筛选系统`
- ✅ 新：`CV-PepFind`

### 副标题更新
- ❌ 旧：`Peptide Screening Platform`
- ✅ 新：`Peptide Discovery Platform`

### 状态徽章
- ❌ 旧：`ESM-2 就绪`
- ✅ 新：`ESM-2 Ready`（英文）

### 按钮文本
- ❌ 旧：`历史记录`
- ✅ 新：`History`（英文）

## 翻译键参考

### 常用键
```
common.welcome
common.close
common.tagline
settings.title
settings.general
settings.account
settings.about
settings.theme
settings.language
settings.lightMode
settings.darkMode
settings.systemMode
settings.version
settings.copyright
hero.greeting
hero.subtitle
hero.prompt1-5
hero.getStarted
hero.learnMore
```

## 测试清单

- [ ] 设置面板正常打开/关闭
- [ ] 语言切换生效（UI文本更新）
- [ ] 语言选择持久化到 localStorage
- [ ] Hero 区域提示自动轮换
- [ ] 所有 8 种语言文本正确显示
- [ ] 设置面板动画流畅
- [ ] 响应式布局（手机/平板/桌面）

## 后续优化建议

1. **主题切换功能** - 在 SettingsPanel 中实现 Light/Dark/System 主题切换
2. **账户面板** - 集成用户认证和账户管理
3. **更多语言** - 根据需要添加更多语言支持
4. **RTL 支持** - 为阿拉伯语等 RTL 语言添加完整支持
5. **翻译完善** - 补充所有缺失的翻译键

## 文件结构
```
client/src/
├── locales/
│   ├── en.json
│   ├── zh.json
│   ├── es.json
│   ├── ar.json
│   ├── fr.json
│   ├── pt.json
│   ├── ru.json
│   ├── ja.json
│   └── index.ts
├── contexts/
│   ├── I18nContext.tsx (新)
│   └── ThemeContext.tsx
├── components/
│   ├── SettingsPanel.tsx (新)
│   ├── HeroSection.tsx (新)
│   └── ...
└── pages/
    └── Home.tsx
```

## 注意事项

1. **语言代码** - 使用标准 ISO 639-1 代码（en, zh, es, ar, fr, pt, ru, ja）
2. **localStorage 键** - `cv-pepfind-language`
3. **默认语言** - 英文（en）
4. **性能** - 所有翻译文件都是静态 JSON，无运行时开销
5. **类型安全** - 使用 TypeScript 类型检查翻译键

---

**最后更新**: 2026-06-18
**版本**: 1.0.0
