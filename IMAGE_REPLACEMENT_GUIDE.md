# Image Replacement Guide

This guide shows you exactly where to replace emojis and text with actual images throughout the application.

## File Structure for Images

Create the following folder structure in your `public` directory:

```
public/
├── images/
│   ├── cher-avatar.png          # Main Cher avatar image
│   ├── closet.png               # Closet background image
│   ├── icons/
│   │   ├── save-icon.png        # Save button icon
│   │   └── trash-icon.png       # Delete/clear button icon
│   ├── clothing/
│   │   ├── hats/
│   │   │   ├── 1.png            # Hat images (full size)
│   │   │   ├── 2.png
│   │   │   ├── 1-thumb.png      # Hat thumbnails
│   │   │   └── 2-thumb.png
│   │   ├── tops/
│   │   │   ├── 1.png            # Top/shirt images (full size)
│   │   │   ├── 2.png
│   │   │   ├── 1-thumb.png      # Top thumbnails
│   │   │   └── 2-thumb.png
│   │   ├── bottoms/
│   │   │   ├── 1.png            # Bottom/pants images (full size)
│   │   │   ├── 2.png
│   │   │   ├── 1-thumb.png      # Bottom thumbnails
│   │   │   └── 2-thumb.png
│   │   └── shoes/
│   │       ├── 1.png            # Shoe images (full size)
│   │       ├── 2.png
│   │       ├── 1-thumb.png      # Shoe thumbnails
│   │       └── 2-thumb.png
│   └── outfits/
│       └── outfit-thumbnail.png  # Generic outfit thumbnail
```

## Replacements by File

### 1. HomePage.js (`src/pages/HomePage.js`)

#### Cher Avatar (Line ~47)
**REPLACE:**
```jsx
<div className="avatar-icon">👩‍🦱</div>
<p>Cher Avatar</p>
<small>(Upload your avatar image)</small>
```
**WITH:**
```jsx
<img src="/images/cher-avatar.png" alt="Cher Avatar" className="avatar-img" />
```

#### Closet Image (Line ~58)
**REPLACE:**
```jsx
<div className="closet-icon">🚪</div>
<p>Closet Image</p>
<small>(Upload closet image)</small>
```
**WITH:**
```jsx
<img src="/images/closet.png" alt="Closet" className="closet-img" />
```

#### Outfit Thumbnails (Line ~77)
**REPLACE:**
```jsx
<span className="outfit-icon">👗</span>
```
**WITH:**
```jsx
<img src="/images/outfits/outfit-thumbnail.png" alt="Outfit" className="outfit-thumbnail-img" />
```

### 2. MannequinOutfitBuilder.js (`src/components/MannequinOutfitBuilder.js`)

#### Save Button Icon (Line ~75)
**REPLACE:**
```jsx
💾 Save Outfit
```
**WITH:**
```jsx
<img src="/images/icons/save-icon.png" alt="Save" className="button-icon" />
Save Outfit
```
**OR (no text):**
```jsx
<img src="/images/icons/save-icon.png" alt="Save Outfit" className="button-icon" />
```

#### Clear Button Icon (Line ~79)
**REPLACE:**
```jsx
🗑️ Clear All
```
**WITH:**
```jsx
<img src="/images/icons/trash-icon.png" alt="Clear" className="button-icon" />
Clear All
```
**OR (no text):**
```jsx
<img src="/images/icons/trash-icon.png" alt="Clear All" className="button-icon" />
```

#### Hat Display (Line ~90)
**REPLACE:**
```jsx
<span className="item-icon">🎩</span>
<div className="item-info">
  <div className="item-name">{getCurrentItem('hat').name}</div>
  <div className="item-color">{getCurrentItem('hat').color}</div>
</div>
```
**WITH:**
```jsx
<img src={`/images/clothing/hats/${getCurrentItem('hat').id}.png`} alt={getCurrentItem('hat').name} className="clothing-image" />
```

#### Top Display (Line ~110)
**REPLACE:**
```jsx
<span className="item-icon">👕</span>
<div className="item-info">
  <div className="item-name">{getCurrentItem('top').name}</div>
  <div className="item-color">{getCurrentItem('top').color}</div>
</div>
```
**WITH:**
```jsx
<img src={`/images/clothing/tops/${getCurrentItem('top').id}.png`} alt={getCurrentItem('top').name} className="clothing-image" />
```

#### Bottom Display (Line ~130)
**REPLACE:**
```jsx
<span className="item-icon">👖</span>
<div className="item-info">
  <div className="item-name">{getCurrentItem('bottom').name}</div>
  <div className="item-color">{getCurrentItem('bottom').color}</div>
</div>
```
**WITH:**
```jsx
<img src={`/images/clothing/bottoms/${getCurrentItem('bottom').id}.png`} alt={getCurrentItem('bottom').name} className="clothing-image" />
```

#### Shoes Display (Line ~150)
**REPLACE:**
```jsx
<span className="item-icon">👠</span>
<div className="item-info">
  <div className="item-name">{getCurrentItem('shoes').name}</div>
  <div className="item-color">{getCurrentItem('shoes').color}</div>
</div>
```
**WITH:**
```jsx
<img src={`/images/clothing/shoes/${getCurrentItem('shoes').id}.png`} alt={getCurrentItem('shoes').name} className="clothing-image" />
```

#### Selection Panel Thumbnails (Lines ~175-210)
**REPLACE each selection item:**
```jsx
<span className="selection-icon">🎩</span>
<div className="selection-details">
  <div className="selection-name">{getCurrentItem('hat').name}</div>
  <div className="selection-color">{getCurrentItem('hat').color}</div>
</div>
```
**WITH:**
```jsx
<img src={`/images/clothing/hats/${getCurrentItem('hat').id}-thumb.png`} alt={getCurrentItem('hat').name} className="selection-thumbnail" />
```

**Repeat for tops, bottoms, and shoes with their respective paths.**

## CSS Classes Already Added

The following CSS classes are ready to use:

- `.avatar-img` - For Cher avatar image
- `.closet-img` - For closet background image  
- `.outfit-thumbnail-img` - For outfit thumbnails
- `.button-icon` - For button icons (save, delete)
- `.clothing-image` - For main clothing item images
- `.selection-thumbnail` - For selection panel thumbnails

## Additional CSS for Image-Only Mode

When removing text completely, add these classes:
- `.image-only` to `.item-display` containers
- `.image-only` to `.selection-item` containers

## Image Specifications

### Recommended Image Sizes:
- **Cher Avatar**: 300x400px (portrait)
- **Closet Image**: 400x300px (landscape)
- **Clothing Images**: 200x200px (square)
- **Clothing Thumbnails**: 80x80px (square)
- **Button Icons**: 40x40px (square)
- **Outfit Thumbnails**: 60x60px (square)

### File Format:
- Use PNG for transparency support
- Use JPG for photographs
- Optimize images for web (compress appropriately)

## Implementation Steps:

1. Create the folder structure in `public/images/`
2. Add your images to the appropriate folders
3. Replace the emoji/text code with image tags as shown above
4. Test each replacement to ensure images load correctly
5. Adjust CSS if needed for proper sizing and alignment

All the TODO comments are already in the code to guide you to the exact locations!