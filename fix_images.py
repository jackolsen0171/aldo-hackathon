#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open('src/pages/CombinedWorkshopPage.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all the image paths - using the correct UTF-8 characters
replacements = [
    ("/closet/Capture d'écran 2025-11-07 à 08.33.08.png", '/closet/001.png'),
    ("/closet/Capture d'écran 2025-11-07 à 11.47.59.png", '/closet/002.png'),
    ("/closet/Capture d'écran 2025-11-07 à 11.21.51.png", '/closet/003.png'),
    ("/closet/Capture d'écran 2025-11-07 à 11.21.59.png", '/closet/004.png'),
    ("/closet/Capture d'écran 2025-11-07 à 11.32.40.png", '/closet/005.png'),
    ("/closet/Capture d'écran 2025-11-07 à 11.33.18.png", '/closet/006.png'),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        count += 1

with open('src/pages/CombinedWorkshopPage.js', 'w', encoding='utf-8') as f:
    f.write(content)
    
print(f"Successfully replaced {count} image paths")

