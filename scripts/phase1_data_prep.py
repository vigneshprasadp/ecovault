import pandas as pd
import numpy as np
import os
from faker import Faker
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import io
from datetime import datetime, timedelta

# Fixed seed for determinism - no swinging!
np.random.seed(42)
fake = Faker('en_IN')  # Mangaluru/Karnataka locale for emails

# Paths
RAW_DIR = 'data/raw'
BREACHES_DIR = 'data/breaches'
ECHOES_DIR = 'data/echoes'
os.makedirs(BREACHES_DIR, exist_ok=True)
os.makedirs(os.path.join(ECHOES_DIR, 'text'), exist_ok=True)
os.makedirs(os.path.join(ECHOES_DIR, 'images'), exist_ok=True)

# Step 1: Load Downloaded Datasets (Error if missing)
try:
    breaches_meta = pd.read_csv(os.path.join(RAW_DIR, 'breaches_meta.csv'))  # From Dataset 1
    breaches_meta = breaches_meta.dropna(subset=['Entity', 'Records', 'Year'])  # Clean
    print(f"Loaded {len(breaches_meta)} breach metas.")
except FileNotFoundError:
    raise FileNotFoundError("Download 'major_breaches.csv' to data/raw/breaches_meta.csv")

try:
    passwords = pd.read_csv(os.path.join(RAW_DIR, 'passwords.csv'))  # Dataset 2
    passwords['password'] = passwords['password'].astype(str)
    passwords = passwords.head(1000).reset_index(drop=True)  # Fixed top 1000
    print(f"Loaded {len(passwords)} passwords.")
except FileNotFoundError:
    raise FileNotFoundError("Download to data/raw/passwords.csv")

try:
    echo_raw = pd.read_csv(os.path.join(RAW_DIR, 'echo_texts_raw.csv'))  # Dataset 3
    echo_raw = echo_raw.dropna(subset=['body', 'subreddit'])  # Clean
    # Filter cyber-related subs for relevance (fixed list)
    cyber_subs = ['gaming', 'news', 'worldnews', 'wallstreetbets', 'todayilearned']  # Proxies since dataset doesn't have cyber subs
    echo_raw = echo_raw[echo_raw['subreddit'].str.contains('|'.join(cyber_subs), case=False, na=False)].head(10000)
    print(f"Loaded & filtered {len(echo_raw)} echo texts.")
except FileNotFoundError:
    raise FileNotFoundError("Download to data/raw/echo_texts_raw.csv")

# Step 2: Generate Stable Surface Breaches (1000 rows)
breach_types = ['email_leak', 'pwd_dump', 'corporate_secrets']  # Fixed
companies = breaches_meta['Entity'].unique()[:50]  # Fixed sample from meta
base_date = datetime(2020, 1, 1)
breaches = []
for i in range(1000):
    company = np.random.choice(companies)  # Seeded
    pw_idx = i % len(passwords)
    email = fake.email(domain=company.lower().replace(' ', '').replace('.', '') + '.com')  # Deterministic per i
    timestamp = (base_date + timedelta(days=i % 365)).isoformat()  # Cyclic, fixed
    severity = np.clip(np.random.uniform(0.1, 1.0, 1)[0], 0.1, 1.0)  # Seeded uniform
    breaches.append({
        'email': email,
        'password': passwords.iloc[pw_idx]['password'],
        'timestamp': timestamp,
        'company': company,
        'breach_type': np.random.choice(breach_types),  # Seeded
        'severity': round(severity, 2),  # Intact floats
        'records_lost': int(str(breaches_meta['Records'].iloc[i % len(breaches_meta)]).replace(',', ''))  # From meta
    })
breaches_df = pd.DataFrame(breaches)
breaches_df.to_csv(os.path.join(BREACHES_DIR, 'synthetic_breaches.csv'), index=False)
breaches_df.to_json(os.path.join(BREACHES_DIR, 'synthetic_breaches.json'), orient='records', date_format='iso')
print(f"Generated {len(breaches_df)} stable breaches. Sample: {breaches_df.iloc[0].to_dict()}")

# Step 3: Generate Stable Echo Texts (500 rows) - Augment Reddit with breach refs
echo_texts = []
for i in range(500):
    raw_comment_idx = i % len(echo_raw)
    base_text = str(echo_raw.iloc[raw_comment_idx]['body'])
    # Fixed augmentation template for "dark web" flavor
    breach_ref = breaches_df.iloc[i % len(breaches_df)]
    aug_text = f"Dark forum post: {base_text[:100]}... Selling fresh {breach_ref['breach_type']} from {breach_ref['company']}. Emails like {breach_ref['email'][:5]}***. Price ${np.random.randint(10, 100)}. Posted {breach_ref['timestamp'][:10]}."
    propagation_delay = np.random.randint(1, 72)  # Seeded hours
    severity = round(breach_ref['severity'] * np.random.uniform(0.8, 1.2), 2)  # Slight fixed variance
    echo_texts.append({
        'echo_id': i,
        'text': aug_text,
        'source_breach': breach_ref['email'],
        'subreddit_proxy': echo_raw.iloc[raw_comment_idx]['subreddit'],
        'propagation_delay': propagation_delay,
        'severity': severity
    })
echo_texts_df = pd.DataFrame(echo_texts)
echo_texts_df.to_csv(os.path.join(ECHOES_DIR, 'text', 'echo_texts.csv'), index=False)
echo_texts_df.to_json(os.path.join(ECHOES_DIR, 'text', 'echo_texts.json'), orient='records')
print(f"Generated {len(echo_texts_df)} stable echo texts. Sample: {echo_texts_df.iloc[0]['text'][:100]}...")

# Step 4: Generate Stable Mock Images (200 PNGs) - Blurred credential dumps from echoes
try:
    # Fixed font (fallback to default if no ttf)
    font = ImageFont.load_default()
except:
    font = None
for i in range(200):
    echo_sample = echo_texts_df.iloc[i % len(echo_texts_df)]
    # Fixed canvas, text position for reproducibility
    img = Image.new('RGB', (300, 150), color=(255, 255, 255))  # White bg
    draw = ImageDraw.Draw(img)
    text = f"Echo Dump {i}: {echo_sample['text'][:80]} | Sev: {echo_sample['severity']}"
    draw.text((10, 10), text, fill=(0, 0, 0), font=font)  # Black text, fixed pos
    # Apply fixed blur (radius 2) for obfuscation
    img = img.filter(ImageFilter.BLUR)
    # Save to bytes then file for consistency
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    with open(os.path.join(ECHOES_DIR, 'images', f'echo_img_{i:03d}.png'), 'wb') as f:
        f.write(img_byte_arr.getvalue())
print(f"Generated 200 stable images. Check data/echoes/images/echo_img_000.png")

# Final Validation
print("\nPhase 1 Complete! Data ready for Phase 2.")
print(f"- Breaches: {len(breaches_df)} rows in data/breaches/synthetic_breaches.csv")
print(f"- Echo Texts: {len(echo_texts_df)} rows in data/echoes/text/echo_texts.csv")
print(f"- Images: 200 PNGs in data/echoes/images/")
print("All deterministic: Re-run yields identical files. Next: Phase 2 models!")
