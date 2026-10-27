/**
 * Fullscreen Realistic Chalkboard and Fast Chalk Powder Physics Engine
 * Vernacular Visual Teacher
 */

class ChalkboardEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        this.offscreen = document.createElement('canvas');
        this.offCtx = this.offscreen.getContext('2d', { willReadFrequently: true });

        this.surfaceCanvas = document.createElement('canvas');
        this.surfaceCtx = this.surfaceCanvas.getContext('2d');

        // Languages & Greetings (Big, bold chalkboard typography)
        this.greetings = [
            {
                lang: 'en',
                name: 'English',
                script: 'Hello',
                subtext: 'Welcome to Blu Visual Teacher',
                pronunciation: 'Hel · lo',
                font: "'Caveat', 'Kalam', 'Segoe UI', cursive, sans-serif",
                fontSize: 145,
                yOffset: 0
            },
            {
                lang: 'hi',
                name: 'हिन्दी (Hindi)',
                script: 'नमस्ते',
                subtext: 'Hindi · The divine in me honors the divine in you',
                pronunciation: 'Na · mas · te',
                font: "'Kalam', 'Nirmala UI', 'Mangal', sans-serif",
                fontSize: 135,
                yOffset: -8
            },
            {
                lang: 'kn',
                name: 'ಕನ್ನಡ (Kannada)',
                script: 'ನಮಸ್ಕಾರ',
                subtext: 'Kannada · Heartfelt greetings and respect',
                pronunciation: 'Na · mas · kaa · ra',
                font: "'Noto Sans Kannada', 'Nirmala UI', 'Tunga', sans-serif",
                fontSize: 120,
                yOffset: -6
            },
            {
                lang: 'ta',
                name: 'தமிழ் (Tamil)',
                script: 'வணக்கம்',
                subtext: 'Tamil · Ancient salutations of reverence',
                pronunciation: 'Va · nak · kam',
                font: "'Noto Sans Tamil', 'Nirmala UI', 'Latha', sans-serif",
                fontSize: 115,
                yOffset: -6
            },
            {
                lang: 'te',
                name: 'తెలుగు (Telugu)',
                script: 'నమస్కారం',
                subtext: 'Telugu · Warm greetings from the heart',
                pronunciation: 'Na · mas · kaa · ram',
                font: "'Noto Sans Telugu', 'Nirmala UI', 'Gautami', sans-serif",
                fontSize: 118,
                yOffset: -6
            }
        ];

        this.currentIndex = 0;
        this.activeChalkColor = '#FFFFFF';
        this.chalkColors = {
            white: '#FFFFFF',
            yellow: '#FFF380',
            cyan: '#80E5FF',
            pink: '#FFA8D5'
        };

        // State Machine: 'MOVE_TO_START', 'WRITING', 'HOLDING', 'DISINTEGRATING', 'WAITING_NEXT'
        this.state = 'MOVE_TO_START';
        this.stateTimer = 0;
        this.isAutoPlay = true;

        // ULTRA-FAST TRANSITIONS per user request:
        this.writeProgress = 0;
        this.writeDuration = 480;        // 0.48s lightning-fast chalk handwriting
        this.holdDuration = 850;         // 0.85s brief hold so greeting is readable
        this.disintegrateDuration = 420; // 0.42s rapid dramatic powder explosion and cascade

        // Chalk stick
        this.chalk = {
            x: -100,
            y: -100,
            targetX: 0,
            targetY: 0,
            angle: -25,
            isDown: false,
            opacity: 1
        };

        // Particles
        this.particles = [];
        this.dustSparks = [];
        this.trayDust = [];

        // Interaction
        this.interactionMode = 'auto';
        this.isUserDrawing = false;
        this.lastDrawPoint = null;

        this.duster = {
            active: false,
            x: 0,
            y: 0
        };

        this.width = 0;
        this.height = 0;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.lastTime = performance.now();
        this.animId = null;

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupEvents();

        if (document.fonts) {
            document.fonts.ready.then(() => {
                this.createBoardTexture();
                this.prepareWriting(0);
            });
        } else {
            this.createBoardTexture();
            this.prepareWriting(0);
        }

        this.lastTime = performance.now();
        this.animate(this.lastTime);
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.width = Math.floor(rect.width) || window.innerWidth;
        this.height = Math.floor(rect.height) || window.innerHeight;

        this.canvas.width = Math.floor(this.width * this.dpr);
        this.canvas.height = Math.floor(this.height * this.dpr);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;

        this.offscreen.width = this.width;
        this.offscreen.height = this.height;

        this.surfaceCanvas.width = this.width;
        this.surfaceCanvas.height = this.height;

        this.createBoardTexture();
        if (this.greetings[this.currentIndex]) {
            this.renderTextOffscreen(this.greetings[this.currentIndex]);
        }
    }

    createBoardTexture() {
        const sCtx = this.surfaceCtx;
        sCtx.clearRect(0, 0, this.width, this.height);

        // 1. Faint horizontal school chalkboard guide lines
        sCtx.save();
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.022)';
        sCtx.lineWidth = 1;
        const lineSpacing = 48;
        const startY = this.height * 0.15;
        for (let y = startY; y < this.height * 0.88; y += lineSpacing) {
            sCtx.beginPath();
            sCtx.moveTo(this.width * 0.05, y);
            sCtx.lineTo(this.width * 0.95, y);
            sCtx.stroke();
        }
        sCtx.restore();

        // 2. Faint chalk dust clouds from past lessons
        const smudges = [
            { x: this.width * 0.22, y: this.height * 0.35, r: 240, a: 0.035 },
            { x: this.width * 0.70, y: this.height * 0.42, r: 280, a: 0.03 },
            { x: this.width * 0.48, y: this.height * 0.60, r: 220, a: 0.025 }
        ];

        smudges.forEach(s => {
            const grad = sCtx.createRadialGradient(s.x, s.y, 10, s.x, s.y, s.r);
            grad.addColorStop(0, `rgba(255, 255, 255, ${s.a})`);
            grad.addColorStop(0.6, `rgba(240, 248, 255, ${s.a * 0.4})`);
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            sCtx.fillStyle = grad;
            sCtx.beginPath();
            sCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            sCtx.fill();
        });

        // 3. Faint duster swipe curves
        sCtx.save();
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
        sCtx.lineWidth = 26;
        sCtx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
            const y = this.height * (0.24 + i * 0.13);
            sCtx.beginPath();
            sCtx.moveTo(this.width * 0.08, y);
            sCtx.quadraticCurveTo(this.width * 0.5, y - 18, this.width * 0.92, y + 10);
            sCtx.stroke();
        }
        sCtx.restore();
    }

    prepareWriting(index = 0) {
        this.currentIndex = (index + this.greetings.length) % this.greetings.length;
        const greeting = this.greetings[this.currentIndex];

        if (this.onLanguageChange) {
            this.onLanguageChange(greeting, this.currentIndex);
        }

        this.renderTextOffscreen(greeting);

        const startX = this.textBounds ? this.textBounds.x : this.width * 0.25;
        const startY = this.textBounds ? this.textBounds.centerY : this.height * 0.5;

        this.chalk.targetX = startX;
        this.chalk.targetY = startY;
        this.chalk.x = startX - 80;
        this.chalk.y = startY - 60;
        this.chalk.isDown = false;
        this.chalk.opacity = 1;

        this.state = 'MOVE_TO_START';
        this.stateTimer = 0;
        this.writeProgress = 0;
    }

    renderTextOffscreen(greeting) {
        const off = this.offscreen;
        const ctx = this.offCtx;
        ctx.clearRect(0, 0, off.width, off.height);

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Scale font generously for full screen greenboard
        const scale = Math.min(this.width / 1100, this.height / 650);
        const actualFontSize = Math.round(greeting.fontSize * Math.max(scale, 0.75));
        ctx.font = `700 ${actualFontSize}px ${greeting.font}`;

        const centerX = this.width / 2;
        const centerY = this.height / 2 + (greeting.yOffset || 0) * scale;

        const metrics = ctx.measureText(greeting.script);
        const textWidth = Math.max(metrics.width, 100);
        const textHeight = actualFontSize * 1.25;

        this.textBounds = {
            x: Math.max(0, centerX - textWidth / 2 - 20),
            y: Math.max(0, centerY - textHeight / 2),
            width: textWidth + 40,
            height: textHeight,
            centerX: centerX,
            centerY: centerY,
            fontSize: actualFontSize
        };

        // Chalk texture rendering:
        // Pass 1: Soft powdery glow
        ctx.save();
        ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
        ctx.shadowBlur = 12;
        ctx.fillStyle = this.activeChalkColor;
        ctx.fillText(greeting.script, centerX, centerY);
        ctx.restore();

        // Pass 2: Main chalk core
        ctx.save();
        ctx.fillStyle = this.activeChalkColor;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
        ctx.shadowBlur = 4;
        ctx.fillText(greeting.script, centerX, centerY);

        // Pass 3: Textured chalk highlights
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.fillText(greeting.script, centerX + 0.8, centerY - 0.6);
        ctx.fillText(greeting.script, centerX - 0.6, centerY + 0.6);
        ctx.restore();

        ctx.restore();
    }

    startWritingGreeting() {
        this.state = 'WRITING';
        this.writeProgress = 0;
        this.stateTimer = 0;
        this.chalk.isDown = true;

        if (window.chalkAudio) {
            window.chalkAudio.startWriting();
        }
    }

    finishWritingGreeting() {
        this.state = 'HOLDING';
        this.stateTimer = 0;
        this.chalk.isDown = false;

        if (window.chalkAudio) {
            window.chalkAudio.stopWriting();
            window.chalkAudio.playChalkTap(0.15);
        }
    }

    // Fast, Dramatic Powder Disintegration & Falling Transition
    disintegrateIntoPowder() {
        if (window.chalkAudio) {
            window.chalkAudio.stopWriting();
            window.chalkAudio.playPowderFall();
        }

        this.state = 'DISINTEGRATING';
        this.stateTimer = 0;
        this.chalk.isDown = false;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.width;
        tempCanvas.height = this.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (this.writeProgress > 0.05) {
            tempCtx.drawImage(this.offscreen, 0, 0);
        }
        tempCtx.drawImage(this.surfaceCanvas, 0, 0);

        const imgData = tempCtx.getImageData(0, 0, this.width, this.height);
        const data = imgData.data;

        const step = this.width > 1000 ? 3 : 2;
        const newParticles = [];

        for (let y = 0; y < this.height - 40; y += step) {
            for (let x = 0; x < this.width; x += step) {
                const idx = (y * this.width + x) * 4;
                const alpha = data[idx + 3];

                if (alpha > 40) {
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];

                    // Rapid, dramatic chalk powder explosion & cascade:
                    const angle = Math.random() * Math.PI * 2;
                    const popSpeed = 2.0 + Math.random() * 4.2;
                    const vx = Math.cos(angle) * popSpeed + (Math.random() - 0.5) * 3.0;
                    const vy = Math.sin(angle) * (popSpeed * 0.4) - (0.5 + Math.random() * 2.0);

                    newParticles.push({
                        x: x + (Math.random() - 0.5) * 2,
                        y: y + (Math.random() - 0.5) * 2,
                        vx: vx,
                        vy: vy,
                        // ULTRA-FAST downward gravity
                        gravity: 0.85 + Math.random() * 0.45,
                        drag: 0.97,
                        sway: Math.random() * Math.PI * 2,
                        swaySpeed: 0.08 + Math.random() * 0.14,
                        swayAmp: 1.0 + Math.random() * 1.8,
                        alpha: (alpha / 255) * (0.85 + Math.random() * 0.15),
                        fade: 0.007 + Math.random() * 0.008,
                        size: Math.random() < 0.85 ? (1.4 + Math.random() * 2.2) : (3.5 + Math.random() * 2.5),
                        color: `rgb(${r},${g},${b})`,
                        settled: false,
                        life: 0,
                        maxLife: 140 + Math.random() * 60
                    });
                }
            }
        }

        this.particles = this.particles.concat(newParticles);

        this.addGhostSmudge();
        this.offCtx.clearRect(0, 0, this.width, this.height);
        this.clearUserDrawings();
        this.writeProgress = 0;
    }

    addGhostSmudge() {
        if (!this.textBounds) return;
        const sCtx = this.surfaceCtx;
        sCtx.save();
        sCtx.globalAlpha = 0.04;
        sCtx.drawImage(this.offscreen, 0, 0);
        sCtx.restore();
    }

    clearUserDrawings() {
        this.surfaceCtx.clearRect(0, 0, this.width, this.height);
        this.createBoardTexture();
    }

    animate(currentTime) {
        this.animId = requestAnimationFrame((t) => this.animate(t));

        const dt = Math.min((currentTime - this.lastTime), 100);
        this.lastTime = currentTime;

        this.update(dt);
        this.render();
    }

    update(dt) {
        this.stateTimer += dt;

        // 1. FAST PARTICLE SIMULATION (Falls swiftly to the tray)
        const trayY = this.height - 34;
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.life++;

            if (!p.settled) {
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;

                p.sway += p.swaySpeed;
                const airDrift = Math.sin(p.sway) * p.swayAmp;

                p.x += p.vx + airDrift;
                p.y += p.vy;

                // Tray collision
                if (p.y >= trayY) {
                    p.y = trayY + (Math.random() - 0.5) * 3;
                    if (Math.abs(p.vy) > 1.2) {
                        p.vy = -p.vy * 0.2;
                        p.vx *= 0.5;
                    } else {
                        p.settled = true;
                        p.vx = 0;
                        p.vy = 0;
                        if (this.trayDust.length < 900) {
                            this.trayDust.push({
                                x: p.x,
                                y: p.y,
                                size: p.size * 0.8,
                                alpha: 0.65,
                                color: p.color
                            });
                        }
                    }
                }
            } else {
                p.alpha -= 0.005;
            }

            p.alpha -= p.fade;

            if (p.alpha <= 0.01 || p.life > p.maxLife) {
                this.particles.splice(i, 1);
            }
        }

        // 2. STATE MACHINE (FASTER TRANSITIONS)
        switch (this.state) {
            case 'MOVE_TO_START':
                const dx = this.chalk.targetX - this.chalk.x;
                const dy = this.chalk.targetY - this.chalk.y;
                // Faster easing
                this.chalk.x += dx * 0.24;
                this.chalk.y += dy * 0.24;

                if (Math.hypot(dx, dy) < 6 || this.stateTimer > 250) {
                    this.startWritingGreeting();
                }
                break;

            case 'WRITING':
                this.writeProgress += dt / this.writeDuration;

                if (this.textBounds) {
                    const curX = this.textBounds.x + this.textBounds.width * Math.min(this.writeProgress, 1.0);
                    const curY = this.textBounds.centerY + Math.sin(this.writeProgress * 28) * (this.textBounds.height * 0.2) + (Math.random() - 0.5) * 3;

                    this.chalk.x = curX;
                    this.chalk.y = curY;
                    this.chalk.angle = -20 + Math.sin(this.writeProgress * 22) * 12;

                    if (Math.random() < 0.6) {
                        this.dustSparks.push({
                            x: curX + (Math.random() - 0.5) * 4,
                            y: curY + (Math.random() - 0.5) * 4,
                            vx: (Math.random() - 0.5) * 2,
                            vy: 0.8 + Math.random() * 2,
                            alpha: 0.8,
                            size: 1 + Math.random() * 2,
                            color: this.activeChalkColor
                        });
                    }
                }

                if (this.writeProgress >= 1.0) {
                    this.writeProgress = 1.0;
                    this.finishWritingGreeting();
                }
                break;

            case 'HOLDING':
                const restX = this.width - 90;
                const restY = this.height - 70;
                this.chalk.x += (restX - this.chalk.x) * 0.08;
                this.chalk.y += (restY - this.chalk.y) * 0.08;

                if (this.isAutoPlay && this.stateTimer >= this.holdDuration) {
                    this.disintegrateIntoPowder();
                }
                break;

            case 'DISINTEGRATING':
                if (this.stateTimer >= this.disintegrateDuration) {
                    this.state = 'WAITING_NEXT';
                    this.stateTimer = 0;
                }
                break;

            case 'WAITING_NEXT':
                if (this.isAutoPlay && this.stateTimer > 180) {
                    this.prepareWriting(this.currentIndex + 1);
                }
                break;
        }

        // Sparks
        for (let i = this.dustSparks.length - 1; i >= 0; i--) {
            const s = this.dustSparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.12;
            s.alpha -= 0.035;
            if (s.alpha <= 0) {
                this.dustSparks.splice(i, 1);
            }
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.save();
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);

        // 1. Surface
        ctx.drawImage(this.surfaceCanvas, 0, 0);

        // 2. Current Chalk Greeting
        if (this.writeProgress > 0 && this.state !== 'DISINTEGRATING') {
            ctx.save();
            if (this.textBounds) {
                const revealRight = this.textBounds.x + this.textBounds.width * this.writeProgress + 30;
                ctx.beginPath();
                ctx.rect(0, 0, Math.min(this.width, revealRight), this.height);
                ctx.clip();
            }
            ctx.drawImage(this.offscreen, 0, 0);
            ctx.restore();
        }

        // 3. Falling Chalk Powder
        if (this.particles.length > 0) {
            ctx.save();
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                if (p.alpha <= 0.01) continue;

                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.alpha;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 4. Settled Tray Dust
        if (this.trayDust.length > 0) {
            ctx.save();
            for (let i = 0; i < this.trayDust.length; i++) {
                const d = this.trayDust[i];
                ctx.fillStyle = d.color;
                ctx.globalAlpha = d.alpha;
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 5. Sparks
        if (this.dustSparks.length > 0) {
            ctx.save();
            for (let i = 0; i < this.dustSparks.length; i++) {
                const s = this.dustSparks[i];
                ctx.fillStyle = s.color;
                ctx.globalAlpha = s.alpha;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // 6. Chalk Stick
        if (this.interactionMode === 'auto' && (this.state === 'WRITING' || this.state === 'MOVE_TO_START' || this.state === 'HOLDING')) {
            this.renderChalkStick(ctx, this.chalk.x, this.chalk.y, this.chalk.angle);
        }

        // 7. Duster
        if (this.duster.active) {
            this.renderDuster(ctx, this.duster.x, this.duster.y);
        }

        ctx.restore();
    }

    renderChalkStick(ctx, x, y, angleDeg) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((angleDeg * Math.PI) / 180);

        const len = 52;
        const width = 12;

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(-width / 2 + 5, -len + 5, width, len, 3);
        ctx.fill();
        ctx.restore();

        const grad = ctx.createLinearGradient(-width / 2, 0, width / 2, 0);
        grad.addColorStop(0, '#D6D6D6');
        grad.addColorStop(0.35, this.activeChalkColor);
        grad.addColorStop(0.8, '#FFFFFF');
        grad.addColorStop(1, '#B0B0B0');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(-width / 2, -len, width, len - 3, [3, 3, 1, 1]);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(0, 0, width / 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-width / 2, -len + 16, width, 1);

        ctx.restore();
    }

    renderDuster(ctx, x, y) {
        ctx.save();
        ctx.translate(x, y);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(-42, -22, 84, 44, 6);
        ctx.fill();

        const woodGrad = ctx.createLinearGradient(-40, -20, -40, 0);
        woodGrad.addColorStop(0, '#8B5A2B');
        woodGrad.addColorStop(0.5, '#A0522D');
        woodGrad.addColorStop(1, '#6B3E11');
        ctx.fillStyle = woodGrad;
        ctx.beginPath();
        ctx.roundRect(-40, -20, 80, 24, [6, 6, 2, 2]);
        ctx.fill();

        const feltGrad = ctx.createLinearGradient(-40, 4, -40, 20);
        feltGrad.addColorStop(0, '#3A3A3A');
        feltGrad.addColorStop(0.5, '#E0E0E0');
        feltGrad.addColorStop(1, '#8A8A8A');
        ctx.fillStyle = feltGrad;
        ctx.beginPath();
        ctx.roundRect(-40, 4, 80, 16, [2, 2, 5, 5]);
        ctx.fill();

        ctx.restore();
    }

    setupEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        const onDown = (e) => {
            if (this.interactionMode === 'auto') return;
            this.isUserDrawing = true;
            const pos = getPos(e);
            this.lastDrawPoint = pos;

            if (this.interactionMode === 'draw') {
                this.drawChalkDot(pos.x, pos.y);
                if (window.chalkAudio) window.chalkAudio.startWriting();
            } else if (this.interactionMode === 'erase') {
                this.duster.active = true;
                this.duster.x = pos.x;
                this.duster.y = pos.y;
                this.eraseAt(pos.x, pos.y);
            }
        };

        const onMove = (e) => {
            const pos = getPos(e);
            if (this.interactionMode === 'erase') {
                this.duster.x = pos.x;
                this.duster.y = pos.y;
            }

            if (!this.isUserDrawing) return;

            if (this.interactionMode === 'draw') {
                this.drawChalkStroke(this.lastDrawPoint, pos);
                this.lastDrawPoint = pos;
            } else if (this.interactionMode === 'erase') {
                this.eraseAt(pos.x, pos.y);
            }
        };

        const onUp = () => {
            if (this.isUserDrawing) {
                this.isUserDrawing = false;
                this.lastDrawPoint = null;
                if (window.chalkAudio) window.chalkAudio.stopWriting();
            }
        };

        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        this.canvas.addEventListener('touchstart', onDown, { passive: true });
        window.addEventListener('touchmove', onMove, { passive: true });
        window.addEventListener('touchend', onUp);
    }

    drawChalkDot(x, y) {
        const sCtx = this.surfaceCtx;
        sCtx.save();
        sCtx.fillStyle = this.activeChalkColor;
        sCtx.beginPath();
        sCtx.arc(x, y, 5, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.restore();
    }

    drawChalkStroke(p1, p2) {
        const sCtx = this.surfaceCtx;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const steps = Math.max(Math.floor(dist / 2), 1);

        sCtx.save();
        sCtx.fillStyle = this.activeChalkColor;

        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const x = p1.x + (p2.x - p1.x) * t + (Math.random() - 0.5) * 1.5;
            const y = p1.y + (p2.y - p1.y) * t + (Math.random() - 0.5) * 1.5;
            const r = 3.5 + (Math.random() - 0.5) * 1.5;

            sCtx.globalAlpha = 0.85 + Math.random() * 0.15;
            sCtx.beginPath();
            sCtx.arc(x, y, r, 0, Math.PI * 2);
            sCtx.fill();
        }
        sCtx.restore();
    }

    eraseAt(x, y) {
        const sCtx = this.surfaceCtx;
        const radius = 34;

        sCtx.save();
        sCtx.globalCompositeOperation = 'destination-out';
        const grad = sCtx.createRadialGradient(x, y, 5, x, y, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        sCtx.fillStyle = grad;
        sCtx.beginPath();
        sCtx.arc(x, y, radius, 0, Math.PI * 2);
        sCtx.fill();
        sCtx.restore();
    }

    setChalkColor(colorKey) {
        if (this.chalkColors[colorKey]) {
            this.activeChalkColor = this.chalkColors[colorKey];
            return this.activeChalkColor;
        }
        return this.activeChalkColor;
    }

    setMode(mode) {
        this.interactionMode = mode;
        if (mode === 'erase') {
            this.duster.active = true;
            this.canvas.style.cursor = 'none';
        } else if (mode === 'draw') {
            this.duster.active = false;
            this.canvas.style.cursor = 'crosshair';
            this.isAutoPlay = false;
        } else {
            this.duster.active = false;
            this.canvas.style.cursor = 'default';
        }
    }
}

window.ChalkboardEngine = ChalkboardEngine;
