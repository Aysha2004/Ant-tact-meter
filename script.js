// Page Navigation System
function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
    }
}

// Ant Counting System
class AntCounter {
    constructor() {
        this.apiKey = null; // Google Gemini API key (optional)
        this.isProcessing = false;
        this.init();
    }

    init() {
        // Initialize file input event listener
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => this.handleFileUpload(event));
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Show file info
        this.showFileInfo(file);
        
        // Show loading
        this.showLoading(true);
        
        try {
            // Process the file
            const result = await this.processFile(file);
            this.displayResults(result);
        } catch (error) {
            console.error('Error processing file:', error);
            this.showError('Error processing file. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) {
            const fileSize = (file.size / 1024 / 1024).toFixed(2);
            const fileType = file.type.startsWith('image/') ? 'Image' : 'Video';
            fileInfo.innerHTML = `
                <strong>File:</strong> ${file.name}<br>
                <strong>Type:</strong> ${fileType}<br>
                <strong>Size:</strong> ${fileSize} MB
            `;
        }
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        const results = document.getElementById('results');
        
        if (loading) loading.style.display = show ? 'block' : 'none';
        if (results) results.style.display = show ? 'none' : 'block';
    }

    async processFile(file) {
        if (file.type.startsWith('image/')) {
            return await this.processImage(file);
        } else if (file.type.startsWith('video/')) {
            return await this.processVideo(file);
        } else {
            throw new Error('Unsupported file type');
        }
    }

    async processImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const result = this.analyzeImage(img);
                    resolve(result);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    async processVideo(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                
                // Analyze first frame
                video.currentTime = 0;
                video.onseeked = () => {
                    ctx.drawImage(video, 0, 0);
                    const result = this.analyzeImage(canvas);
                    resolve(result);
                };
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    analyzeImage(imgElement) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = imgElement.width || imgElement.videoWidth;
        canvas.height = imgElement.height || imgElement.videoHeight;
        
        // Draw image to canvas
        ctx.drawImage(imgElement, 0, 0);
        
        // Get image data for analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Analyze pixel patterns to detect ants
        const antCount = this.detectAnts(data, canvas.width, canvas.height);
        const activityLevel = this.calculateActivityLevel(antCount);
        const insights = this.generateInsights(antCount, activityLevel);
        
        return {
            antCount,
            activityLevel,
            insights,
            canvas: canvas
        };
    }

    detectAnts(imageData, width, height) {
        let darkPixelCount = 0;
        let totalPixels = width * height;
        
        // Count dark pixels (potential ants)
        for (let i = 0; i < imageData.length; i += 4) {
            const r = imageData[i];
            const g = imageData[i + 1];
            const b = imageData[i + 2];
            
            // Calculate brightness
            const brightness = (r + g + b) / 3;
            
            // Consider pixels with low brightness as potential ants
            if (brightness < 100) {
                darkPixelCount++;
            }
        }
        
        // Estimate ant count based on dark pixel clusters
        const darkPixelRatio = darkPixelCount / totalPixels;
        const estimatedAnts = Math.round(darkPixelRatio * 1000); // Rough estimation
        
        // Apply some randomness for demo purposes
        const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2
        return Math.max(1, Math.round(estimatedAnts * randomFactor));
    }

    calculateActivityLevel(antCount) {
        if (antCount < 5) return 'Low';
        if (antCount < 15) return 'Moderate';
        if (antCount < 30) return 'High';
        return 'Very High';
    }

    generateInsights(antCount, activityLevel) {
        const insights = [];
        
        if (antCount === 1) {
            insights.push('Single ant detected - might be a scout!');
        } else if (antCount < 5) {
            insights.push('Small group - could be foraging or exploring');
        } else if (antCount < 15) {
            insights.push('Medium colony activity - likely food gathering');
        } else {
            insights.push('Large colony activity - major operation in progress!');
        }
        
        if (activityLevel === 'Low') {
            insights.push('Colony seems calm and organized');
        } else if (activityLevel === 'Moderate') {
            insights.push('Normal colony activity detected');
        } else if (activityLevel === 'High') {
            insights.push('High activity - something exciting happening!');
        } else {
            insights.push('Intense activity - major colony event!');
        }
        
        // Add random fun facts
        const funFacts = [
            'Ants can carry up to 50 times their body weight!',
            'Some ant colonies can have millions of members',
            'Ants communicate through pheromones',
            'Ants have been farming for millions of years',
            'Ants are found on every continent except Antarctica'
        ];
        
        insights.push(funFacts[Math.floor(Math.random() * funFacts.length)]);
        
        return insights;
    }

    displayResults(result) {
        const antCountEl = document.getElementById('antCount');
        const activityLevelEl = document.getElementById('activityLevel');
        const insightsEl = document.getElementById('insights');
        const chartEl = document.getElementById('chart');
        
        if (antCountEl) {
            antCountEl.innerHTML = `<strong>🐜 Ant Count:</strong> ${result.antCount} ants detected`;
        }
        
        if (activityLevelEl) {
            activityLevelEl.innerHTML = `<strong>📊 Activity Level:</strong> ${result.activityLevel}`;
        }
        
        if (insightsEl) {
            insightsEl.innerHTML = `<strong>💡 Insights:</strong><br>${result.insights.join('<br>')}`;
        }
        
        if (chartEl && result.canvas) {
            // Create a simple chart visualization
            chartEl.innerHTML = `
                <h5>Detection Analysis</h5>
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin: 20px 0;">🐜</div>
                    <div style="font-size: 24px; color: #ff6b35;">${result.antCount}</div>
                    <div style="font-size: 16px; opacity: 0.8;">ants detected</div>
                </div>
            `;
        }
        
        // Show results
        const results = document.getElementById('results');
        if (results) {
            results.style.display = 'block';
        }
    }

    showError(message) {
        const results = document.getElementById('results');
        if (results) {
            results.innerHTML = `
                <div style="color: #ff6b6b; text-align: center; padding: 20px;">
                    <h4>❌ Error</h4>
                    <p>${message}</p>
                </div>
            `;
            results.style.display = 'block';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize ant counter
    window.antCounter = new AntCounter();
    
    // Set initial page
    showPage('landing-page');
    
    // Add smooth scrolling for better UX
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Global function for page navigation (accessible from HTML)
window.showPage = showPage;
window.handleFileUpload = function(event) {
    if (window.antCounter) {
        window.antCounter.handleFileUpload(event);
    }
};
