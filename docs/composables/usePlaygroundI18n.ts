import { computed } from 'vue'
import { useData } from 'vitepress'

const messages = {
  en: {
    description: 'Enter a Zod schema and generate mock data. Edit the code and press "Generate Mock".',
    running: 'Running...',
    timeout: 'Execution timeout (5s)',
    placeholder: 'Press "Generate Mock" to see the result here.',
    examples: 'Examples:',
    preflight: 'Preflight',
    noIssues: 'No issues',
    warning: 'Warning',
    error: 'Error',
  },
  'ja-JP': {
    description: 'Zodスキーマを入力してモックデータを生成できます。コードを編集して「Generate Mock」ボタンを押してください。',
    running: '実行中...',
    timeout: '実行タイムアウト (5秒)',
    placeholder: '「Generate Mock」を押すと結果がここに表示されます',
    examples: '例:',
    preflight: 'プリフライト',
    noIssues: '問題なし',
    warning: '警告',
    error: 'エラー',
  },
  'zh-CN': {
    description: '输入 Zod schema 生成模拟数据。编辑代码后点击「Generate Mock」按钮。',
    running: '运行中...',
    timeout: '执行超时 (5秒)',
    placeholder: '点击「Generate Mock」查看结果',
    examples: '示例:',
    preflight: '预检',
    noIssues: '没有问题',
    warning: '警告',
    error: '错误',
  },
  'hi-IN': {
    description: 'Zod schema दर्ज करें और मॉक डेटा जनरेट करें। कोड संपादित करें और "Generate Mock" बटन दबाएँ।',
    running: 'चल रहा है...',
    timeout: 'निष्पादन टाइमआउट (5s)',
    placeholder: 'परिणाम देखने के लिए "Generate Mock" दबाएँ',
    examples: 'उदाहरण:',
    preflight: 'प्रीफ़्लाइट',
    noIssues: 'कोई समस्या नहीं',
    warning: 'चेतावनी',
    error: 'त्रुटि',
  },
} as const

type Messages = typeof messages['en']

export function usePlaygroundI18n() {
  const { lang } = useData()

  const t = computed<Messages>(() => {
    return messages[lang.value as keyof typeof messages] ?? messages.en
  })

  return { t }
}
