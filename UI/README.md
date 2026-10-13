# IELTS Speaking Coach — UI Architecture & Maintenance Guide

This UI is modularized so you can easily locate, maintain, and update any specific screen or feature without sifting through one huge file.

---

## 📁 Directory Structure

```text
UI/
├── index.html            # Main single-page application shell
├── README.md             # This guide
├── css/                  # 🎨 Modular Stylesheets
│   ├── style.css         # Master CSS importing all files below
│   ├── base.css          # Design tokens, fonts, colors, typography, reset
│   ├── layout.css        # Header, desktop sidebar tabs, mobile bottom nav
│   ├── components.css    # Reusable UI cards, buttons, badges, pills, progress rings
│   ├── chat.css          # 💬 Chat Coach page styles & sticky input bar
│   ├── practice.css      # 📚 Practice Arena styles & 4 category cards
│   └── test.css          # 🎙️ Speaking Test styles, recorder, timer & score report
└── js/                   # ⚡ Modular Scripts
    ├── app.js            # Main controller, app init & page navigation switcher
    ├── data.js           # 🗄️ Practice questions & 24 speaking test topics data
    ├── chat.js           # 💬 AI Chat Coach logic, messages & quick chips
    ├── practice/         # 📚 Practice Arena Sub-modules (5 Files)
    │   ├── grammar.js    # Option 1: Grammar Lessons & feedback
    │   ├── vocabulary.js # Option 2: Vocabulary Lessons & collocations
    │   ├── listening.js  # Option 3: Listening Tests & drills
    │   ├── writing.js    # Option 4: Writing Lessons & structure
    │   └── practiceUI.js # Practice UI orchestrator & view controller
    └── test.js           # 🎙️ Speaking test simulation, timer, mic recording & report
```

---

## 🔍 Quick "Where to Change What" Cheat Sheet

| I want to change... | Which file to edit? |
| :--- | :--- |
| **Color palette, fonts, spacing, shadows** | [`UI/css/base.css`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/css/base.css) |
| **Header, user greeting, sidebar tabs, mobile nav bar** | [`UI/css/layout.css`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/css/layout.css) |
| **Buttons, pill chips, feedback cards, progress rings** | [`UI/css/components.css`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/css/components.css) |
| **Chat bubbles, quick suggestion chips, sticky bottom input** | [`UI/css/chat.css`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/css/chat.css) & [`UI/js/chat.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/chat.js) |
| **Practice Arena layout & card styling** | [`UI/css/practice.css`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/css/practice.css) |
| **Grammar questions & grammar-specific feedback** | [`UI/js/practice/grammar.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/practice/grammar.js) |
| **Vocabulary collocations & lexical feedback** | [`UI/js/practice/vocabulary.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/practice/vocabulary.js) |
| **Listening test prompts & audio drill feedback** | [`UI/js/practice/listening.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/practice/listening.js) |
| **Writing essay topics & coherence feedback** | [`UI/js/practice/writing.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/practice/writing.js) |
| **Practice UI lifecycle, card transitions & word counter** | [`UI/js/practice/practiceUI.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/practice/practiceUI.js) |
| **Speaking test recording button, timer ring, score report** | [`UI/css/test.css`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/css/test.css) & [`UI/js/test.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/test.js) |
| **Tab switching or adding a new page** | [`UI/js/app.js`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/js/app.js) & [`UI/index.html`](file:///Users/rifatjahan/Desktop/Hobbies/audio_to_text/UI/index.html) |

---

## 🚀 How to Run Locally

Start your local web server from this directory:
```bash
python3 -m http.server 3000
```
Open **`http://localhost:3000/UI/`** in your browser.
