# Security Policy

## Reporting

If you find a vulnerability that could lead to account data leakage, accidental unfollow, cookie exposure, or arbitrary code execution, please do not publish account details or cookies in a public issue.

Open a minimal, desensitized issue, or contact the repository owner through the security contact listed on the repository profile.

## Scope

This project is an AI-generated local desktop utility. It does not provide a server, telemetry, or remote account storage. The main risks are:

- Platform API/anti-bot changes
- Accidental destructive actions if the user confirms a wrong selection
- Local data exposure if the user commits `data/` or screenshots with real accounts
- Third-party dependency vulnerabilities

## Safe use

- Back up the local `data` directory before updating.
- Review every batch before confirming unfollow.
- Never post cookies, `app-state.json`, account IDs, or real screenshots.
- Use the tool only on accounts you own and in accordance with platform rules.
