-- =======================================================
-- MRCPCH Study Platform - D1 Database Seed SQL Script
-- =======================================================

-- 1. Insert Seed Users
-- Passwords:
-- - drstudent@example.com (Password: student123)
-- - mrcpchadmin@example.com (Password: admin123)
-- - superadmin@example.com (Password: super123)
INSERT INTO users (id, email, password_hash, full_name, role, is_active)
VALUES 
  ('u1_student', 'drstudent@example.com', '$2a$10$X8XhW0M89v88N6mU5S88OeVepZz44nPhSUpD5p.pPZ0vP0p6vP0pS', 'Dr. Kathir Student', 'Student', 1),
  ('u2_admin', 'mrcpchadmin@example.com', '$2a$10$X8XhW0M89v88N6mU5S88OeVepZz44nPhSUpD5p.pPZ0vP0p6vP0pA', 'Dr. Alice Roberts (Admin)', 'Admin', 1),
  ('u3_superadmin', 'superadmin@example.com', '$2a$10$X8XhW0M89v88N6mU5S88OeVepZz44nPhSUpD5p.pPZ0vP0p6vP0pSA', 'Senior Board Chair (SuperAdmin)', 'SuperAdmin', 1);

-- 2. Insert Question Banks
INSERT INTO question_banks (id, name, description, category, created_by, is_archived)
VALUES
  ('qb_cards', 'Cardiology Core Essentials', 'High-yield cardiology questions covering congenital anomalies, murmurs, and ECG findings.', 'Cardiology', 'u2_admin', 0),
  ('qb_neonatal', 'Neonet & Prematurity Care', 'Advanced neonatal medicine, incubator care, respiratory distress, and metabolic emergencies.', 'Neonatal', 'u2_admin', 0),
  ('qb_respiratory', 'Pediatric Pulmonology & Allergy', 'Common upper/lower airway conditions, asthma guidelines, and allergy profiles in children.', 'Respiratory', 'u2_admin', 0);

-- 3. Insert Questions
-- Bank 1: Cardiology
INSERT INTO questions (id, bank_id, question, options_json, correct_answer, explanation, tags, difficulty)
VALUES
  ('q_card1', 'qb_cards', 'A 2-month-old infant is brought to clinic due to feeding difficulties and diaphoresis when breastfeeding. On examination, there is a harsh pansystolic murmur heard loudest at the left lower sternal border (LLSB). What is the most likely diagnosis?', '["Ventricular Septal Defect (VSD)", "Atrial Septal Defect (ASD)", "Patent Ductus Arteriosus (PDA)", "Tetralogy of Fallot"]', 0, 'A harsh holosystolic/pansystolic murmur at the left lower sternal border in an infant presenting with feeding difficulties and poor weight gain is highly characteristic of a moderate-to-large Ventricular Septal Defect (VSD). Smaller VSDs may present with louder murmurs but without systemic symptoms.', 'VSD,Murmur,Congenital Anomalies', 'Medium'),
  ('q_card2', 'qb_cards', 'A parent brings their 4-year-old child who experienced a transient loss of consciousness while crying intensely after scraping her knee. She turned blue, went limp, but recovered fully within 30 seconds. What is the appropriate management?', '["Immediate Pediatric Cardiology Referral", "Reassurance and Education on Breath-Holding Spells", "Start Oral Propranolol Therapy", "Arrange an Urgent 24-Hour ambulatory ECG"]', 1, 'This scenario describes a classic cyanotic Breath-holding Spell, which is a benign, paroxysmal non-epileptic event common in children aged 6 months to 6 years. Reassurance is the mainstay of treatment, explaining that it is involuntary and children eventually outgrow them.', 'Autonomic,Fainting,Syncope', 'Easy'),
  ('q_card3', 'qb_cards', 'Which of the following clinical features is pathognomonic of Coarctation of the Aorta in a neonate presenting with cardiogenic shock?', '["Wide pulse pressure with bounding pulses", "Significant blood pressure and pulse differential between upper and lower limbs", "Harsh diastolic murmur at the apex", "Right axis deviation on electrocardiogram"]', 1, 'Coarctation of the aorta is a critical duct-dependent lesion. As the ductus arteriosus closes, perfusion to the lower limbs drops drastically, leading to a noticeable pulse delay and severe blood pressure discrepancy between right upper limb and lower limbs.', 'Coarctation,Pulses,Duct-dependent', 'Medium');

-- Bank 2: Neonatal
INSERT INTO questions (id, bank_id, question, options_json, correct_answer, explanation, tags, difficulty)
VALUES
  ('q_neo1', 'qb_neonatal', 'A preterm male infant delivered at 30 weeks gestation presents with respiratory distress including expiratory grunting, nasal flaring, and chest recessions within minutes of birth. Chest radiograph demonstrates a diffuse ground-glass appearance and air bronchograms. What is the primary underlying pathophysiology?', '["Deficiency of surfactant causing alveoli collapse", "Ineffective clearance of fetal lung fluid", "In-utero infection causing focal consolidation", "Echocardiographic evidence of right-to-left shunting"]', 0, 'This case is classic for Respiratory Distress Syndrome (RDS) secondary to surfactant deficiency. Surfactant reduces alveolar surface tension; without it, alveoli collapse, resulting in micro-atelectasis and the characteristic ground-glass/air-bronchogram chest X-ray.', 'RDS,Surfactant,Prematurity', 'Medium'),
  ('q_neo2', 'qb_neonatal', 'A term neonate presents with severe jaundice on Day 2 of life. The serum total bilirubin is rapidly rising and has crossed the exchange transfusion threshold. Blood typing reveals Maternal type O-positive and Infant type A-positive. What test should be ordered next to confirm immune hemolysis?', '["Direct Antiglobulin Test (DAT / Coombs Test)", "G6PD enzyme assay", "Maternal antibody screen", "Hemoglobin electrophoresis"]', 0, 'In a term neonate presenting with early, severe jaundice with ABO incompatibility (Mother is O, baby is A or B), a Direct Antiglobulin Test (DAT) is the essential gold standard diagnostic test to confirm immune-mediated hemolytic anemia.', 'ABO Incompatibility,Jaundice,Coombs', 'Easy');

-- Bank 3: Respiratory
INSERT INTO questions (id, bank_id, question, options_json, correct_answer, explanation, tags, difficulty)
VALUES
  ('q_resp1', 'qb_respiratory', 'A 2-year-old toddler is brought to the Emergency Department at midnight with a barking cough and hoarse voice. On examination, the child is anxious, with mild inspiratory stridor audible when agitated, but no stridor at rest. Temperature is 37.6°C. What is the first-line treatment?', '["Inhaled Racemic Epinephrine", "A single dose of Oral Dexamethasone (0.15 mg/kg)", "Intravenous Amoxicillin", "Continuous Salbutamol nebulization"]', 1, 'Viral laryngotracheobronchitis (Croup) presents with a characteristic barking cough, hoarseness, and stridor. For mild-to-moderate croup of any level, a single dose of oral dexamethasone (0.15–0.6 mg/kg) or oral prednisolone is first-line and has been shown to reduce hospitalization rates.', 'Croup,Stridor,Dexamethasone', 'Medium');

-- 4. Insert Study Materials
INSERT INTO study_materials (id, title, description, category, file_url, uploaded_by)
VALUES
  ('sm_1', 'NICE Guideline: Asthma Diagnosis in Children', 'Comprehensive guide detailing criteria, spirometry cutoffs, and management pathways.', 'Guidelines', 'https://pub-mrcpch-materials.cloudflare-r2.com/NICE_Asthma_Guideline_Pediatrics.pdf', 'u2_admin'),
  ('sm_2', 'Neonatal Resuscitation Program (NRP) Flowchart', 'High-quality decision diagram for golden hour resuscitation pathways.', 'Handouts', 'https://pub-mrcpch-materials.cloudflare-r2.com/NRP_Resuscitation_Chart_8th_Ed.pdf', 'u2_admin'),
  ('sm_3', 'ECG Quick-Reference Guide for Pediatrics', 'Visual cards for calculating QTc, reading axis deviation, and flagging VSD/ASD patterns.', 'Notes', 'https://pub-mrcpch-materials.cloudflare-r2.com/Pediatric_ECG_Reference_Card.pdf', 'u2_admin');

-- 5. Insert Activity Logs
INSERT INTO activity_logs (id, user_id, action, metadata, created_at)
VALUES
  ('log_1', 'u3_superadmin', 'SYSTEM_INITIALIZATION', '{"status":"success","seeded_tables":["users","question_banks","questions","study_materials"]}', '2026-06-14 00:00:00'),
  ('log_2', 'u2_admin', 'QUESTION_BANK_CREATED', '{"bank_id":"qb_cards","name":"Cardiology Core Essentials"}', '2026-06-14 01:05:00');
