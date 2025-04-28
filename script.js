document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const passwordInput = document.getElementById('password-input');
    const strengthBar = document.getElementById('strength-bar');
    const entropyValue = document.getElementById('entropy-value');
    const crackTimeValue = document.getElementById('crack-time-value');
    const pwnedValue = document.getElementById('pwned-value');
    const zxcvbnScore = document.getElementById('zxcvbn-score');
    const recommendationsList = document.getElementById('recommendations-list');
    const toggleVisibilityBtn = document.getElementById('toggle-visibility');
    const copyBtn = document.getElementById('copy-btn');
    const generateBtn = document.getElementById('generate-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Theme Toggle Functionality
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        themeIcon.classList.toggle('fa-moon');
        themeIcon.classList.toggle('fa-sun');
        
        // Update tooltip text
        const tooltip = themeToggle.querySelector('.tooltip');
        tooltip.textContent = newTheme === 'dark' ? 'Light Mode' : 'Dark Mode';
    });

    // Password Visibility Toggle
    toggleVisibilityBtn.addEventListener('click', () => {
        const icon = toggleVisibilityBtn.querySelector('i');
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.replace('fa-eye', 'fa-eye-slash');
            icon.style.color = '#fff'; // Ensure visibility
        } else {
            passwordInput.type = 'password';
            icon.classList.replace('fa-eye-slash', 'fa-eye');
            icon.style.color = '#fff'; // Ensure visibility
        }
    });

    // Copy Password Functionality
    copyBtn.addEventListener('click', () => {
        if (passwordInput.value) {
            passwordInput.select();
            document.execCommand('copy');
            
            // Visual feedback
            const icon = copyBtn.querySelector('i');
            icon.classList.replace('fa-copy', 'fa-check');
            setTimeout(() => {
                icon.classList.replace('fa-check', 'fa-copy');
            }, 1000);
        }
    });

    // Generate Password Functionality
    generateBtn.addEventListener('click', () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let password = '';
        for (let i = 0; i < 16; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        passwordInput.value = password;
        analyzePassword(password);
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
        
        // Update strength meter
        strengthBar.style.width = `${(result.score + 1) * 20}%`;
        strengthBar.style.backgroundColor = getStrengthColor(result.score);
        
        // Calculate entropy
        const entropy = calculateEntropy(password);
        entropyValue.textContent = `${entropy.toFixed(1)} bits`;
        
        // Estimate crack time
        crackTimeValue.textContent = estimateCrackTime(entropy);
        
        // Set zxcvbn score
        zxcvbnScore.textContent = `${result.score}/4`;
        zxcvbnScore.style.color = getStrengthColor(result.score);
        
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
        const guessesPerSecond = 1e12; // Modern GPU
        const seconds = Math.pow(2, entropy) / guessesPerSecond;
        
        if (seconds < 1) return "Instant";
        if (seconds < 60) return `${Math.floor(seconds)} sec`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
        if (seconds < 86400) return `${Math.floor(seconds / 86400)} days`;
        if (seconds < 31536000) return `${Math.floor(seconds / 31536000)} years`;
        return "Centuries";
    }

    // HIBP API Check
    async function checkHIBP(password) {
        pwnedValue.textContent = "Checking...";
        pwnedValue.style.color = "#f8961e";
        
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
                pwnedValue.textContent = `Breached (${count} times)`;
                pwnedValue.style.color = "#f72585";
            } else {
                pwnedValue.textContent = "No breaches found";
                pwnedValue.style.color = "#4cc9f0";
            }
        } catch (error) {
            pwnedValue.textContent = "API Error";
            pwnedValue.style.color = "#f72585";
        }
    }

    // SHA-1 Hashing
    async function sha1(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    // Recommendations
    function provideRecommendations(password, zxcvbnResult) {
        let recommendations = [];
        
        if (password.length < 12) {
            recommendations.push(`Use at least 12 characters (currently ${password.length})`);
        }
        
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^a-zA-Z0-9]/.test(password);
        
        if (!hasLower) recommendations.push("Add lowercase letters");
        if (!hasUpper) recommendations.push("Add uppercase letters");
        if (!hasNumber) recommendations.push("Include numbers");
        if (!hasSpecial) recommendations.push("Add special characters (!@#$%^&*)");
        
        if (zxcvbnResult.feedback.warning) {
            recommendations.push(zxcvbnResult.feedback.warning);
        }
        
        recommendationsList.innerHTML = recommendations
            .map(rec => `
                <div class="rec-item">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>${rec}</p>
                </div>
            `)
            .join('');
    }

    // Reset UI
    function resetUI() {
        strengthBar.style.width = "0%";
        strengthBar.style.backgroundColor = "#f72585";
        entropyValue.textContent = "0 bits";
        crackTimeValue.textContent = "Instant";
        pwnedValue.textContent = "-";
        pwnedValue.style.color = "inherit";
        zxcvbnScore.textContent = "0/4";
        zxcvbnScore.style.color = "inherit";
        
        recommendationsList.innerHTML = `
            <div class="rec-item">
                <i class="fas fa-check-circle"></i>
                <p>Use at least 12 characters</p>
            </div>
            <div class="rec-item">
                <i class="fas fa-check-circle"></i>
                <p>Include numbers & symbols</p>
            </div>
        `;
    }

    // Helper: Get color based on strength score
    function getStrengthColor(score) {
        const colors = ['#f72585', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b'];
        return colors[score] || '#f72585';
    }
});