# 🎮 FPS Survival Game

<div align="center">

![Three.js](https://img.shields.io/badge/Three.js-0.177.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue.svg)
![License](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)
![Status](https://img.shields.io/badge/Status-Active-green.svg)

**A first-person shooter survival game built with TypeScript and Three.js**

[🎯 Play Game](https://meistroburger.github.io/D3D) • [📝 Report Bug](https://github.com/meistroburger/D3D/issues) • [✨ Request Feature](https://github.com/meistroburger/D3D/issues)

</div>

---

## 📖 Overview

Explore a beautiful 3D world filled with villages, forests, and dynamic weather while fighting off waves of enemies in this immersive browser-based FPS game. Built entirely with modern web technologies, no plugins required!

<div align="center">
  <img src="screenshots/gameplay.png" alt="Gameplay Screenshot" width="600">
</div>

## ✨ Features

### 🌍 **Open World Environment**
- **Procedural Terrain**: Rolling hills and valleys with realistic height mapping
- **3 Unique Villages**: Discover settlements with detailed houses and architecture
- **Living Ecosystem**: 150+ trees, 300+ flowers, and scattered rock formations
- **Dynamic Weather**: Atmospheric lighting with moving clouds and fog effects

### ⚔️ **Combat System**
- **Multiple Weapons**: Rifle, Shotgun, and Pistol with unique characteristics
- **Smart Enemy AI**: 4 enemy types with varying difficulty levels
- **Wave-based Survival**: Progressive difficulty with boss encounters
- **Realistic Physics**: Bullet trajectories, recoil, and impact effects

### 🎮 **Advanced Gameplay**
- **Smooth Movement**: WASD controls with diagonal strafing (Q/E)
- **Terrain Following**: Realistic jumping and gravity physics
- **Health Regeneration**: Strategic healing mechanics
- **Visual Effects**: Muzzle flashes, particle systems, and damage indicators

### 🎨 **Enhanced Graphics**
- **PBR Materials**: Physically-based rendering for realistic surfaces
- **Dynamic Lighting**: Multiple light sources with proper shadows
- **Post-processing**: Advanced tone mapping and visual filters
- **Optimized Performance**: Efficient rendering for smooth gameplay

## 🎯 Controls

| Key | Action |
|-----|--------|
| **WASD** | Move around the world |
| **Q/E** | Diagonal strafing |
| **SPACE** | Jump |
| **Mouse** | Look around and aim |
| **Left Click** | Shoot |
| **R** | Reload weapon |
| **1-3** | Switch weapons |

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed on your system
- Modern web browser with WebGL 2.0 support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/meistroburger/D3D.git
   cd D3D
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run start
   ```

4. **Open in browser**
   Navigate to `http://localhost:1234`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

## 🏗️ Project Structure

```
D3D/
├── public/
│   └── index.html          # Main HTML file
├── src/
│   └── index.ts           # Main TypeScript game logic
├── screenshots/           # Game screenshots
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── LICENSE              # Project license
└── README.md           # This file
```

## 🎮 Game Mechanics

### Enemy Types
- **Basic (Red)**: Standard enemies with balanced stats
- **Fast (Orange)**: Quick but weak enemies
- **Heavy (Dark Red)**: Slow but powerful tanks
- **Boss (Purple)**: Rare, extremely challenging foes

### Weapon Stats
| Weapon | Damage | Fire Rate | Ammo | Reload Time |
|--------|--------|-----------|------|-------------|
| Rifle | 25 | 150ms | 30 | 2.0s |
| Shotgun | 15x5 | 800ms | 8 | 3.0s |
| Pistol | 20 | 300ms | 15 | 1.5s |

## 🛠️ Built With

- **[Three.js](https://threejs.org/)** - 3D graphics library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Parcel](https://parceljs.org/)** - Zero-configuration build tool
- **WebGL 2.0** - Hardware-accelerated graphics

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add comments for complex logic
- Test your changes thoroughly

## 📸 Screenshots

<div align="center">
  <img src="screenshots/village.png" alt="Village View" width="300">
  <img src="screenshots/combat.png" alt="Combat Scene" width="300">
  <img src="screenshots/landscape.png" alt="Landscape View" width="300">
</div>

## 🗺️ Roadmap

- [ ] Multiplayer support
- [ ] Custom weapon skins
- [ ] Achievement system
- [ ] Sound effects and music
- [ ] Mobile touch controls
- [ ] Map editor
- [ ] VR support

## 📄 License

This project is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. See the [LICENSE](LICENSE) file for details.

**TL;DR**: You can contribute, modify, and share this project, but not for commercial purposes.

## 🙏 Acknowledgments

- Three.js community for excellent documentation
- Contributors who help improve the game
- Players who provide feedback and bug reports

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/meistroburger/D3D/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/meistroburger/D3D/discussions)
- 📧 **Contact**: your-email@example.com

---

<div align="center">
  <p>Made with ❤️ by the FPS Survival Game team</p>
  <p>⭐ Star this repo if you enjoyed the game!</p>
</div>
