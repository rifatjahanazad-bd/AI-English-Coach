"""game.py - Fast Phrases: Interactive Speed Sentence Building Game.

Faithful implementation of "Fast Phrases" (from Games to Learn English):
- Context / Scene clues with pictures/emojis
- Fast sentence chunk assembly (choose the chunks in the correct syntactic order)
- Tightening countdown timer
- Consecutive streak multipliers (x1, x2, x3, x4...)
- 3 Lives system (❤️ ❤️ ❤️)
- Category selection (Present, Past/Future, Location/Prepositions, Modals/Questions)
- Fully modular data engine ready for web export (JSON)
"""

import json
import os
import random
import select
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# -------------------------------------------------------------------------
# ANSI Terminal Colors
# -------------------------------------------------------------------------
class Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    CYAN = "\033[96m"
    MAGENTA = "\033[95m"
    WHITE = "\033[97m"
    BG_BLUE = "\033[44m"
    BG_GREEN = "\033[42m"
    BG_RED = "\033[41m"


# -------------------------------------------------------------------------
# Data Model
# -------------------------------------------------------------------------
@dataclass
class SentenceItem:
    id: str
    context: str          # Visual/scene prompt description
    emoji: str            # Visual scene icon
    chunks: List[str]     # Correct sequence of phrase chunks
    distractor: Optional[str] = None  # Optional decoy chunk

    @property
    def full_sentence(self) -> str:
        return " ".join(self.chunks)


# -------------------------------------------------------------------------
# Question Banks by Category (Fast Phrases Grammar Sets)
# -------------------------------------------------------------------------
CATEGORY_BANKS: Dict[str, Dict[str, Any]] = {
    "present": {
        "title": "Present Tenses (Is / Are & Continuous)",
        "emoji": "⚡",
        "description": "Practice rapid syntax with Present Simple & Continuous actions.",
        "items": [
            SentenceItem("pr-1", "A fluffy cat napping quietly", "🐱", ["The cat", "is sleeping", "on the warm sofa."]),
            SentenceItem("pr-2", "Children playing in the schoolyard", "⚽", ["The children", "are playing", "football outside."]),
            SentenceItem("pr-3", "A chef preparing vegetable soup", "🍲", ["The chef", "is cooking", "fresh soup", "in the kitchen."]),
            SentenceItem("pr-4", "A girl reading an exciting adventure book", "📖", ["She", "is reading", "a new book", "in the library."]),
            SentenceItem("pr-5", "Two friends riding bicycles in the park", "🚲", ["They", "are riding", "their bicycles", "together."]),
            SentenceItem("pr-6", "The sun shining brightly today", "☀️", ["The sun", "is shining", "brightly today."]),
            SentenceItem("pr-7", "Birds singing early in the morning", "🐦", ["The birds", "are singing", "in the tall tree."]),
            SentenceItem("pr-8", "A young boy drinking cold orange juice", "🥤", ["He", "is drinking", "a glass of juice."]),
        ]
    },
    "past_future": {
        "title": "Past & Future Tenses (Did, Will & Going to)",
        "emoji": "⏳",
        "description": "Assemble narrative sentences across past events and future plans.",
        "items": [
            SentenceItem("pf-1", "Yesterday we visited the grand museum", "🏛️", ["We", "visited", "the national museum", "yesterday."]),
            SentenceItem("pf-2", "He bought fresh apples at the market", "🍎", ["He", "bought", "fresh apples", "at the grocery store."]),
            SentenceItem("pf-3", "Tomorrow it will rain heavily", "🌧️", ["It", "will rain", "heavily tomorrow", "afternoon."]),
            SentenceItem("pf-4", "They are going to travel to London", "✈️", ["They", "are going to visit", "London", "next summer."]),
            SentenceItem("pf-5", "She wrote an inspiring letter to her friend", "✉️", ["She", "wrote", "a long letter", "last night."]),
            SentenceItem("pf-6", "The student finished all homework early", "📝", ["The student", "finished", "the homework", "before dinner."]),
            SentenceItem("pf-7", "I will call you as soon as I arrive", "📞", ["I", "will call you", "when I arrive home."]),
            SentenceItem("pf-8", "We saw an incredible movie last weekend", "🎬", ["We", "saw", "an exciting film", "last Saturday."]),
        ]
    },
    "location": {
        "title": "Location & Prepositions (In, On, Under, Next to)",
        "emoji": "📍",
        "description": "Fast spatial grammar matching items to their exact locations.",
        "items": [
            SentenceItem("loc-1", "A puppy hiding beneath the wooden table", "🐶", ["The small puppy", "is hiding", "under the wooden table."]),
            SentenceItem("loc-2", "Keys resting on the dining table", "🔑", ["The car keys", "are lying", "on the kitchen counter."]),
            SentenceItem("loc-3", "A clock hanging on the wall between posters", "⏰", ["The clock", "hangs", "on the wall", "between the posters."]),
            SentenceItem("loc-4", "A red car parked in front of the house", "🚗", ["A red car", "is parked", "in front of", "the house."]),
            SentenceItem("loc-5", "Books organized neatly inside the backpack", "🎒", ["The textbooks", "are inside", "the blue backpack."]),
            SentenceItem("loc-6", "A coffee cup sitting next to the laptop", "☕", ["The hot coffee", "is sitting", "next to", "the laptop."]),
            SentenceItem("loc-7", "A bridge crossing over the wide river", "🌉", ["The stone bridge", "crosses", "over the deep river."]),
        ]
    },
    "modals": {
        "title": "Questions & Modals (Can, Must, Should, Wh-)",
        "emoji": "❓",
        "description": "Construct interrogatives and modal expressions rapidly.",
        "items": [
            SentenceItem("mod-1", "Asking where the train station is located", "🚉", ["Where", "is", "the nearest train station", "?"]),
            SentenceItem("mod-2", "Can penguins fly in the cold sky?", "🐧", ["Penguins", "cannot fly", "in the sky."]),
            SentenceItem("mod-3", "Asking what time the store opens tomorrow", "🏪", ["What time", "does", "the supermarket open", "tomorrow?"]),
            SentenceItem("mod-4", "Students should study before the test", "📚", ["You", "should study", "carefully before", "the final exam."]),
            SentenceItem("mod-5", "Is there any fresh milk left in the fridge?", "🥛", ["Is there", "any milk left", "in the refrigerator", "?"]),
            SentenceItem("mod-6", "Why did she leave the party so early?", "🎉", ["Why", "did she leave", "the birthday party", "so early?"]),
            SentenceItem("mod-7", "We must wear seatbelts in the car", "🛡️", ["Everyone", "must wear", "a seatbelt", "in the car."]),
        ]
    }
}


# -------------------------------------------------------------------------
# Fast Phrases Game Engine
# -------------------------------------------------------------------------
class FastPhrasesGame:
    """Fast Phrases speed game coordinator."""

    def __init__(self, initial_lives: int = 3, base_time: float = 12.0):
        self.lives = initial_lives
        self.base_time = base_time
        self.score = 0
        self.streak = 0
        self.max_streak = 0
        self.total_answered = 0
        self.correct_answered = 0

    @property
    def multiplier(self) -> int:
        """Streak multiplier: x1 for 0-2, x2 for 3-5, x3 for 6-8, x4 for 9+."""
        if self.streak >= 9:
            return 4
        elif self.streak >= 6:
            return 3
        elif self.streak >= 3:
            return 2
        return 1

    def calculate_round_time(self) -> float:
        """Timer speeds up as streak increases! (12s -> 10s -> 8s -> 6s)."""
        if self.streak >= 8:
            return max(5.0, self.base_time - 6.0)
        elif self.streak >= 5:
            return max(7.0, self.base_time - 4.0)
        elif self.streak >= 3:
            return max(9.0, self.base_time - 2.0)
        return self.base_time

    def get_timed_input(self, timeout_sec: float) -> Tuple[Optional[str], float]:
        """Reads input with a live countdown timeout on POSIX/macOS."""
        start_time = time.time()
        print(f"\n{Color.CYAN}⏱️  Time limit: {timeout_sec:.1f}s | Type chunk numbers in order (e.g. 2 1 3):{Color.RESET} ", end="", flush=True)

        if sys.platform != "win32":
            rlist, _, _ = select.select([sys.stdin], [], [], timeout_sec)
            elapsed = time.time() - start_time
            if rlist:
                line = sys.stdin.readline().strip()
                return line, elapsed
            else:
                return None, timeout_sec
        else:
            # Fallback for Windows without select.select on stdin
            line = input()
            elapsed = time.time() - start_time
            if elapsed > timeout_sec:
                return None, elapsed
            return line.strip(), elapsed

    def play_round(self, item: SentenceItem) -> bool:
        """Executes a single fast-phrase round."""
        target_chunks = item.chunks
        round_time = self.calculate_round_time()

        # Scramble chunks with index mapping
        indexed_chunks = list(enumerate(target_chunks))
        random.shuffle(indexed_chunks)

        # Correct index order player must pick
        # e.g. if chunk 0 was scrambled to option 2, player must pick option 2 first
        correct_order = []
        for orig_idx, _ in enumerate(target_chunks):
            # Find where orig_idx landed in scrambled list (1-based index)
            for scrambled_pos, (actual_orig_idx, _) in enumerate(indexed_chunks):
                if actual_orig_idx == orig_idx:
                    correct_order.append(str(scrambled_pos + 1))
                    break

        # Display Round Header
        hearts = "❤️ " * self.lives + "🖤 " * (3 - self.lives)
        print("\n" + "═" * 68)
        print(f"{Color.BOLD}Score: {Color.YELLOW}{self.score}{Color.RESET} | "
              f"Streak: {Color.GREEN}{self.streak}🔥{Color.RESET} (Multiplier: {Color.MAGENTA}x{self.multiplier}{Color.RESET}) | "
              f"Lives: {hearts}")
        print("═" * 68)

        # Context & Scene Display
        print(f"\n{Color.BOLD}🖼️  SCENE:{Color.RESET} {item.emoji}  {Color.WHITE}{item.context}{Color.RESET}")
        print(f"{Color.CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Color.RESET}")

        # Display Scrambled Options
        print(f"{Color.BOLD}CHOOSE THE WORDS IN ORDER:{Color.RESET}")
        options_line = []
        for pos, (_, chunk_text) in enumerate(indexed_chunks, 1):
            options_line.append(f"{Color.BG_BLUE}{Color.WHITE} {pos} {Color.RESET} {Color.YELLOW}[ {chunk_text} ]{Color.RESET}")
        print("  " + "   ".join(options_line))

        # Get Player Input under time limit
        user_input, elapsed = self.get_timed_input(round_time)
        self.total_answered += 1

        # Check Timeout
        if user_input is None:
            self.lives -= 1
            self.streak = 0
            print(f"\n{Color.BG_RED}{Color.WHITE} ⏰ TIME OUT! {Color.RESET} {Color.RED}You ran out of time! (-1 Life){Color.RESET}")
            print(f"👉 Correct sentence: {Color.GREEN}{item.full_sentence}{Color.RESET}")
            time.sleep(1.5)
            return False

        # Parse player sequence (supports space-separated "2 1 3" or continuous "213")
        clean_input = user_input.replace(",", " ").strip()
        tokens = clean_input.split() if " " in clean_input else list(clean_input)

        if tokens == correct_order:
            self.streak += 1
            if self.streak > self.max_streak:
                self.max_streak = self.streak
            self.correct_answered += 1

            # Points calculation: speed bonus + base points * multiplier
            remaining_ratio = max(0.2, (round_time - elapsed) / round_time)
            points = int(100 * self.multiplier * remaining_ratio)
            self.score += points

            print(f"\n{Color.BG_GREEN}{Color.WHITE} ✓ CORRECT! {Color.RESET} {Color.GREEN}+{points} pts ({elapsed:.1f}s){Color.RESET}")
            print(f"✨ {Color.WHITE}{item.full_sentence}{Color.RESET}")
            time.sleep(1.0)
            return True
        else:
            self.lives -= 1
            self.streak = 0
            print(f"\n{Color.BG_RED}{Color.WHITE} ✗ INCORRECT! {Color.RESET} {Color.RED}Order was wrong! (-1 Life){Color.RESET}")
            print(f"👉 Correct order: {Color.YELLOW}{' → '.join(correct_order)}{Color.RESET}")
            print(f"👉 Correct sentence: {Color.GREEN}{item.full_sentence}{Color.RESET}")
            time.sleep(1.8)
            return False

    def play_session(self, items: List[SentenceItem]) -> None:
        """Runs the main game loop until lives run out or all sentences cleared."""
        deck = items.copy()
        random.shuffle(deck)

        print("\n" + "⚡" * 34)
        print(f"{Color.BOLD}   STARTING FAST PHRASES SPEED RUN!{Color.RESET}")
        print("⚡" * 34)
        time.sleep(1.0)

        for round_num, item in enumerate(deck, 1):
            if self.lives <= 0:
                break
            print(f"\n{Color.BOLD}--- ROUND {round_num} OF {len(deck)} ---{Color.RESET}")
            self.play_round(item)

        # Game Over / Victory Summary
        self.show_summary()

    def show_summary(self) -> None:
        """Displays final game statistics and rank."""
        print("\n" + "━" * 68)
        print(f"{Color.BOLD}🏁 GAME OVER · FINAL RESULTS{Color.RESET}")
        print("━" * 68)

        accuracy = (self.correct_answered / self.total_answered * 100) if self.total_answered > 0 else 0

        # Rank appraisal
        if self.score >= 1200 and accuracy >= 80:
            rank = "👑 Fast Phrases Grandmaster (Band 8.5+ Speed)"
        elif self.score >= 700:
            rank = "⚡ Fluent Speed Builder (Band 7.0+)"
        elif self.score >= 300:
            rank = "🌱 Intermediate Phrase Builder (Band 6.0)"
        else:
            rank = "📚 Practice Apprentice"

        print(f"⭐ Final Score:        {Color.YELLOW}{self.score}{Color.RESET}")
        print(f"🔥 Max Streak:          {Color.GREEN}{self.max_streak}{Color.RESET}")
        print(f"🎯 Accuracy:            {Color.CYAN}{accuracy:.1f}%{Color.RESET} ({self.correct_answered}/{self.total_answered} correct)")
        print(f"🏆 Rank:                {Color.BOLD}{rank}{Color.RESET}")
        print("━" * 68 + "\n")


# -------------------------------------------------------------------------
# Web Export API (For later embedding into the website)
# -------------------------------------------------------------------------
def export_game_data_for_web(output_file: Optional[Path] = None) -> Dict[str, Any]:
    """Exports all Fast Phrases categories and items to JSON format.

    When you implement this game into your web app, this data feeds directly
    into UI/js/practice/ without changing any data schemas!
    """
    web_data = {}
    for cat_key, cat_val in CATEGORY_BANKS.items():
        web_data[cat_key] = {
            "title": cat_val["title"],
            "emoji": cat_val["emoji"],
            "description": cat_val["description"],
            "items": [asdict(item) for item in cat_val["items"]]
        }

    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(web_data, f, indent=2)

    return web_data


# -------------------------------------------------------------------------
# Main Menu & Interactive CLI Launcher
# -------------------------------------------------------------------------
def launch_visual_game(port: int = 8080) -> None:
    """Launches the visual browser game (matching gamestolearnenglish.com)."""
    import http.server
    import socketserver
    import webbrowser

    game_dir = Path(__file__).resolve().parent

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(game_dir), **kwargs)

        def log_message(self, format, *args):
            # Suppress noisy HTTP request logs
            pass

    # Find free port if 8080 is busy
    actual_port = port
    for p in range(port, port + 20):
        try:
            with socketserver.TCPServer(("", p), Handler) as httpd:
                actual_port = p
                url = f"http://localhost:{actual_port}/"
                print("\n" + "=" * 65)
                print(f"🌐 Fast Phrases Visual Game running at:")
                print(f"   👉 {url}")
                print("   (Identical to https://www.gamestolearnenglish.com/fast-phrases/#game)")
                print("   Press Ctrl+C anytime to stop server.")
                print("=" * 65 + "\n")
                webbrowser.open(url)
                httpd.serve_forever()
                break
        except OSError:
            continue


def main() -> None:
    if "--web" in sys.argv:
        launch_visual_game()
        return

    print("\n" + "━" * 68)
    print(f"{Color.BOLD}🎮 FAST PHRASES — SPEED SENTENCE BUILDING GAME{Color.RESET}")
    print("Inspired by games to learn English (gamestolearnenglish.com)")
    print("━" * 68)
    print("Train your brain to recognize sentence patterns and speed build!")

    print("\nChoose how to play:")
    print(f"  {Color.GREEN}[W] 🌐 LAUNCH VISUAL BROWSER GAME (Exact match with images & sound){Color.RESET}")
    print("\nOr play in Terminal (Grammar Sets):")
    keys = list(CATEGORY_BANKS.keys())
    for idx, key in enumerate(keys, 1):
        cat = CATEGORY_BANKS[key]
        print(f"  [{idx}] {cat['emoji']} {cat['title']} ({len(cat['items'])} sentences)")
    print(f"  [{len(keys) + 1}] 🎲 Random Endless Mix (All Categories)")
    print(f"  [{len(keys) + 2}] 📤 Export Game Data to JSON (for website integration)")
    print("  [Q] Quit")

    choice = input("\nEnter choice (W, 1-6 or Q): ").strip().lower()

    if choice in ("q", "quit", "exit"):
        print("\n👋 Keep practicing your sentence speed! See you soon.")
        return

    if choice == "w":
        launch_visual_game()
        return

    # Option: Export to JSON for web integration
    if choice == str(len(keys) + 2):
        export_path = Path(__file__).resolve().parent / "fast_phrases_data.json"
        export_game_data_for_web(export_path)
        print(f"\n✅ Exported web data to: {export_path}")
        print("You can import this JSON directly into your UI when ready!")
        return

    # Select category items
    if choice == str(len(keys) + 1):
        all_items = []
        for cat in CATEGORY_BANKS.values():
            all_items.extend(cat["items"])
        game = FastPhrasesGame(initial_lives=3, base_time=12.0)
        game.play_session(all_items)
    else:
        try:
            cat_idx = int(choice) - 1
            if 0 <= cat_idx < len(keys):
                selected_key = keys[cat_idx]
                items = CATEGORY_BANKS[selected_key]["items"]
                game = FastPhrasesGame(initial_lives=3, base_time=12.0)
                game.play_session(items)
            else:
                print("Invalid selection. Exiting.")
        except ValueError:
            print("Invalid input. Exiting.")


if __name__ == "__main__":
    main()
