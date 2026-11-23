# Bro's Food Court — connect page
Static page, plain HTML/CSS/JS, no build step.

    index.html   markup (edit links + menu list here)
    css/style.css  styles (colours are variables at the top)
    js/main.js   menu viewer (images + PDFs), open/closed badge
    assets/      logo, menu/ (your menu files)

## Before sending
1. Menu: put files in assets/menu/ and list them in `data-menu-files` on the Menu card.
2. Reviews: swap the search link for https://search.google.com/local/writereview?placeid=PLACE_ID
3. Maps: swap in the share link of the exact listing if the search link opens the wrong spot.
4. After deploying, set og:image to the full live URL of assets/logo.png.
5. Hours: edit OPEN_HOUR / CLOSE_HOUR at the top of js/main.js (currently 1 PM to 1 AM).

Deploy: push to a GitHub repo root, Settings → Pages → main / root.
