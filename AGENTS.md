# Project Guidelines

## Core Principles
- **Respect Existing Logic**: When adding new features or modifying the application, ensure that existing business logic (attendance calculations, multi-role access controls, Bengali translations, etc.) is preserved.
- **Iterative Development**: Build features one by one as requested, maintaining the stability of the core system.
- **GitHub Deployment**: When a GitHub repository link is provided, follow instructions to pull the latest commit and deploy it.

## Technical Context
- **Multi-Role System**: The app supports Managers, Mentors, and Team Members. Always verify that changes respect the specific views and permissions for each role.
- **Localization**: The application uses a mix of English and Bengali. Maintain this localization in new UI elements.
- **Attendance Logic**: Attendance status depends on punches, leave requests, and manual adjustments. Use `getEffectiveStatus` from `src/utils.ts` where applicable.

## Custom User Workflow Commands
- **"গীটের লাস্ট পুশ নিয়ে আসো"**: Automatically run `git fetch origin` and `git reset --hard origin/main` to pull and reset to the latest commit from the remote repository.
- **"Dev ডেটাবেইজে সুইচ কর" / "ডেটাবেইজ সুইচ করতে"**: Switch the MongoDB database connection to `Attendance_NoticePortal_Dev` in `server.ts` and `.env.example`.
- **"Attendance_NoticePortal এই ডেটাবেইজে যাও"**: Switch the MongoDB database connection to the main `Attendance_NoticePortal` database in `server.ts` and `.env.example`.
