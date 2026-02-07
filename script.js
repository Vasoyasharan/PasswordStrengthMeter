document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const passwordInput = document.getElementById('password-input');
    const strengthBar = document.getElementById('strength-bar');
    const strengthGlow = document.getElementById('strength-glow');
    const strengthPercentage = document.getElementById('strength-percentage');
    const entropyValue = document.getElementById('entropy-value');
    const crackTimeValue = document.getElementById('crack-time-value');
    const pwnedValue = document.getElementById('pwned-value');
    const zxcvbnScore = document.getElementById('zxcvbn-score');
    const recommendationsList = document.getElementById('recommendations-list');
    const toggleVisibilityBtn = document.getElementById('toggle-visibility');
    const copyBtn = document.getElementById('copy-btn');
    const generateBtn = document.getElementById('generate-btn');
    const themeToggle = document.getElementById('theme-toggle');

    // Initialize theme from localStorage or system preference
    initializeTheme();

    // Theme Toggle Functionality
    themeToggle.addEventListener('click', toggleTheme);

    // Password Visibility Toggle
    toggleVisibilityBtn.addEventListener('click', () => {
        const icon = toggleVisibilityBtn.querySelector('i');
        const isPassword = passwordInput.type === 'password';
        
        passwordInput.type = isPassword ? 'text' : 'password';
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
        
        // Add animation
        toggleVisibilityBtn.style.transform = 'scale(1.1)';
        setTimeout(() => {
            toggleVisibilityBtn.style.transform = 'scale(1)';
        }, 200);
    });

    // Copy Password Functionality with enhanced feedback
    copyBtn.addEventListener('click', async () => {
        if (!passwordInput.value) return;
        
        try {
            await navigator.clipboard.writeText(passwordInput.value);
            
            // Visual feedback
            const btnContent = copyBtn.querySelector('.btn-content');
            const originalHTML = btnContent.innerHTML;
            
            btnContent.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
            copyBtn.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
            
            setTimeout(() => {
                btnContent.innerHTML = originalHTML;
                copyBtn.style.background = '';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    });

    // Generate Password Functionality with options
    generateBtn.addEventListener('click', () => {
        const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const lowercase = 'abcdefghijklmnopqrstuvwxyz';
        const numbers = '0123456789';
        const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
        
        const allChars = uppercase + lowercase + numbers + symbols;
        let password = '';
        
        // Ensure password has at least one of each type
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += symbols[Math.floor(Math.random() * symbols.length)];
        
        // Fill remaining characters randomly
        for (let i = password.length; i < 16; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        
        // Shuffle password
        password = password.split('').sort(() => Math.random() - 0.5).join('');
        
        passwordInput.value = password;
        analyzePassword(password);
        
        // Add animation
        generateBtn.style.transform = 'scale(0.95) rotate(5deg)';
        setTimeout(() => {
            generateBtn.style.transform = 'scale(1) rotate(0deg)';
        }, 300);
    });

    // Real-time Password Analysis
    passwordInput.addEventListener('input', (e) => {
        analyzePassword(e.target.value);
    });

    // Main Password Analysis Function
    function analyzePassword(password) {
        if (!password) {
            resetUI();
            return;
        }

        // Calculate with zxcvbn
        const result = zxcvbn(password);
        
        // Calculate entropy
        const entropy = calculateEntropy(password);
        
        // Update strength meter with smooth animation
        const percentage = (result.score + 1) * 20;
        strengthBar.style.width = `${percentage}%`;
        strengthPercentage.textContent = `${percentage}%`;
        
        // Update strength bar color
        const color = getStrengthColor(result.score);
        strengthBar.style.background = `linear-gradient(90deg, 
            #ef4444 0%,
            #f59e0b 25%,
            #eab308 40%,
            #84cc16 60%,
            #10b981 100%)`;
        
        // Animate glow effect
        if (percentage > 0) {
            strengthGlow.style.opacity = '0.5';
        } else {
            strengthGlow.style.opacity = '0';
        }
        
        // Update values
        entropyValue.textContent = entropy.toFixed(1);
        crackTimeValue.textContent = estimateCrackTime(entropy);
        zxcvbnScore.textContent = result.score;
        
        // Update score color
        const scoreColors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];
        zxcvbnScore.parentElement.style.color = scoreColors[result.score];
        
        // Check if password is breached
        checkHIBP(password);
        
        // Provide recommendations
        provideRecommendations(password, result);
    }

    // Entropy Calculation
    function calculateEntropy(password) {
        let poolSize = 0;
        if (/[a-z]/.test(password)) poolSize += 26;
        if (/[A-Z]/.test(password)) poolSize += 26;
        if (/[0-9]/.test(password)) poolSize += 10;
        if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;
        return Math.log2(poolSize || 1) * password.length;
    }

    // Crack Time Estimation
    function estimateCrackTime(entropy) {
        const guessesPerSecond = 1e12; // Modern GPU (1 trillion guesses/sec)
        const seconds = Math.pow(2, entropy) / guessesPerSecond;
        
        if (seconds < 1) return "Instant";
        if (seconds < 60) return `${Math.floor(seconds)}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
        if (seconds < 31536000) return `${Math.floor(seconds / 86400)}d`;
        if (seconds < 3153600000) return `${Math.floor(seconds / 31536000)}y`;
        return "Centuries";
    }

    // HIBP API Check with debouncing
    let hibpTimeout;
    async function checkHIBP(password) {
        clearTimeout(hibpTimeout);
        pwnedValue.textContent = "Checking...";
        pwnedValue.parentElement.style.color = 'inherit';
        
        hibpTimeout = setTimeout(async () => {
            try {
                const hash = await sha1(password);
                const prefix = hash.substring(0, 5);
                const suffix = hash.substring(5).toUpperCase();
                
                const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
                if (!response.ok) throw new Error('API Error');
                
                const data = await response.text();
                const hashes = data.split('\r\n');
                const found = hashes.find(h => h.split(':')[0] === suffix);
                
                if (found) {
                    const count = parseInt(found.split(':')[1]);
                    pwnedValue.textContent = `Breached (${count}x)`;
                    pwnedValue.style.color = '#ef4444';
                } else {
                    pwnedValue.textContent = 'Safe';
                    pwnedValue.style.color = '#10b981';
                }
            } catch (error) {
                pwnedValue.textContent = 'Unable to check';
                pwnedValue.style.color = '#f59e0b';
            }
        }, 800); // Debounce by 800ms
    }

    // SHA-1 Hashing
    async function sha1(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    // Recommendations with better indicators
    function provideRecommendations(password, zxcvbnResult) {
        let recommendations = [];
        
        const checks = {
            length: password.length >= 12,
            lower: /[a-z]/.test(password),
            upper: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^a-zA-Z0-9]/.test(password)
        };
        
        // Build recommendations
        const messages = {
            length: `Minimum 12 characters (${password.length}/12)`,
            lower: 'Include lowercase letters (a-z)',
            upper: 'Include uppercase letters (A-Z)',
            number: 'Include numbers (0-9)',
            special: 'Add special characters (!@#$%^&*)'
        };
        
        // Only show unchecked items
        Object.entries(checks).forEach(([key, value]) => {
            if (!value) {
                recommendations.push({ text: messages[key], key });
            }
        });
        
        // Add feedback warning if available
        if (zxcvbnResult.feedback.warning) {
            recommendations.push({ text: zxcvbnResult.feedback.warning, key: 'warning' });
        }
        
        // If no recommendations, show all as complete
        if (recommendations.length === 0) {
            recommendations = Object.entries(messages).map(([key, text]) => ({
                text,
                key
            }));
        }
        
        recommendationsList.innerHTML = recommendations
            .map(rec => `
                <div class="rec-item">
                    <div class="rec-indicator ${checks[rec.key] ? 'complete' : 'checking'}"></div>
                    <i class="fas ${checks[rec.key] ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    <p>${rec.text}</p>
                </div>
            `)
            .join('');
    }

    // Reset UI
    function resetUI() {
        strengthBar.style.width = "0%";
        strengthPercentage.textContent = "0%";
        strengthGlow.style.opacity = '0';
        entropyValue.textContent = "0";
        crackTimeValue.textContent = "Instant";
        pwnedValue.textContent = "-";
        pwnedValue.style.color = "inherit";
        zxcvbnScore.textContent = "0";
        zxcvbnScore.parentElement.style.color = "inherit";
        
        recommendationsList.innerHTML = `
            <div class="rec-item">
                <div class="rec-indicator checking"></div>
                <i class="fas fa-lock"></i>
                <p>Use at least 12 characters</p>
            </div>
            <div class="rec-item">
                <div class="rec-indicator checking"></div>
                <i class="fas fa-hashtag"></i>
                <p>Include numbers & symbols</p>
            </div>
        `;
    }

    // Theme Management
    function initializeTheme() {
        const savedTheme = localStorage.getItem('theme') || 
                          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeToggleUI(savedTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeToggleUI(newTheme);
        
        // Add rotation animation
        themeToggle.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            themeToggle.style.transform = 'rotate(0deg)';
        }, 300);
    }

    function updateThemeToggleUI(theme) {
        themeToggle.classList.toggle('dark', theme === 'dark');
    }

    // Helper: Get color based on strength score
    function getStrengthColor(score) {
        const colors = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981'];
        return colors[score] || '#ef4444';
    }
});
