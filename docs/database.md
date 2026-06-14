# Database Architecture Guide

This project leverages **Cloudflare D1**, a secure, highly performance-tuned serverless SQL database built on SQLite.

## Table Relationships

```
  +--------------+          +-----------------------+          +-------------------------+
  |    users     | 1 ---- * |     question_banks    | 1 ---- * |        questions        |
  +--------------+          +-----------------------+          +-------------------------+
         |                                                                  |
         | 1                                                                | 1
         |                                                                  |
         v *                                                                v *
  +--------------+          +-----------------------+          +-------------------------+
  |   attempts   | 1 ---- * |    attempt_answers    | * ---- 1 |        bookmarks        |
  +--------------+          +-----------------------+          +-------------------------+
```

## Entity Details

- **`users`**: Represents students, core admins, and platform super-administrators. Passwords are state-hashed using bcrypt or SHA-256 with salts in workers.
- **`question_banks`**: Groups associated lists of medical pediatric questions. Standard categories include Cardiology, Neonatology, and Respiratory.
- **`questions`**: Individual Pediatric question items. Store the answer choices as a stringified JSON array in `options_json` to support flexible multi-choice patterns.
- **`attempts` & `attempt_answers`**: Audit logs of full trial simulations completed by users. We track completion time, correctness, and selected options for analytics charts.
- **`bookmarks`**: Connects users to specific questions for review.
- **`study_materials`**: References handouts and clinical guidelines.

## Essential Queries

### Fetching Student Strengths/Weaknesses by Question Bank Category
```sql
SELECT 
  qb.category,
  COUNT(aa.id) as total_answers,
  SUM(aa.is_correct) as correct_answers,
  (CAST(SUM(aa.is_correct) AS REAL) / COUNT(aa.id)) * 100 as accuracy
FROM attempt_answers aa
JOIN questions q ON q.id = aa.question_id
JOIN question_banks qb ON qb.id = q.bank_id
JOIN attempts a ON a.id = aa.attempt_id
WHERE a.user_id = ?
GROUP BY qb.category;
```
