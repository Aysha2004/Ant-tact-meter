const fileUpload = document.getElementById('fileUpload');
const video = document.getElementById('userVideo');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const API_KEY = "AIzaSyBNFcjk5VrC0S4T3iX4rpNjLH1AP8xekpQ"; // Optional: Replace with your Gemini API key

// Show loading state
function showLoading() {
    document.getElementById('results').innerHTML = `
        <div style="color: #ff6b35; font-size: 20px;">
            🔍 Analyzing your file... Please wait...
        </div>
    `;
}

// Show error message
function showError(message) {
    document.getElementById('results').innerHTML = `
        <div style="color: #ff4444; font-size: 18px;">
            ❌ Error: ${message}
        </div>
    `;
}

// Optional: Detect ants with API (returns number, fallback to motion detection)
async function detectAntsAPI(frameDataURL) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Count the number of ants visible in this image. Respond only with a number. If none, respond with 0.'
                },
                { image_data: { image_bytes: frameDataURL.split(',')[1] } }
              ]
            }
          ]
        })
      }
    );
    const result = await response.json();
    const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text || '0';
    const count = parseInt(textOutput.match(/\d+/)?.[0]) || 0;
    return count;
  } catch (error) {
    console.error("API Error:", error);
    return 0;
  }
}

// Enhanced fallback detection for images
function detectAntsFallbackImage(img) {
  const tmpCanvas = document.createElement('canvas');
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCanvas.width = img.width;
  tmpCanvas.height = img.height;
  tmpCtx.drawImage(img, 0, 0, img.width, img.height);
  const data = tmpCtx.getImageData(0, 0, img.width, img.height).data;

  let darkPixels = 0;
  let totalPixels = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Look for dark brown/black pixels (typical ant colors)
    if (r < 80 && g < 60 && b < 40) darkPixels++;
  }
  
  // Calculate percentage of dark pixels and estimate ant count
  const darkPercentage = (darkPixels / totalPixels) * 100;
  
  if (darkPercentage > 15) {
    // High concentration of dark pixels suggests multiple ants
    return Math.floor(darkPercentage / 3);
  } else if (darkPercentage > 5) {
    // Medium concentration suggests 1-3 ants
    return Math.max(1, Math.floor(darkPercentage / 2));
  } else {
    // Low concentration suggests no ants or very small ants
    return 0;
  }
}

// Enhanced video motion detection
function detectMotion(prevFrame, currFrame, width, height) {
  let diff = 0;
  let motionPixels = 0;
  
  for (let i = 0; i < currFrame.data.length; i += 4) {
    const rDiff = Math.abs(currFrame.data[i] - prevFrame[i]);
    const gDiff = Math.abs(currFrame.data[i + 1] - prevFrame[i + 1]);
    const bDiff = Math.abs(currFrame.data[i + 2] - prevFrame[i + 2]);
    
    const totalDiff = rDiff + gDiff + bDiff;
    if (totalDiff > 30) { // Threshold for significant pixel change
      motionPixels++;
    }
    diff += totalDiff;
  }
  
  // Estimate ant count based on motion intensity
  const motionPercentage = (motionPixels / (width * height)) * 100;
  
  if (motionPercentage > 10) {
    return Math.floor(motionPercentage / 2);
  } else if (motionPercentage > 3) {
    return Math.max(1, Math.floor(motionPercentage));
  } else {
    return 0;
  }
}

// Handle file upload
fileUpload.addEventListener('change', async (e) => {
  video.style.display = "none";
  video.src = "";
  document.getElementById('results').innerHTML = "";
  const chartCanvas = document.getElementById('chart');
  chartCanvas.getContext('2d').clearRect(0, 0, chartCanvas.width, chartCanvas.height);

  const file = e.target.files[0];
  if (!file) return;

  if (file.type.startsWith('image/')) {
    const img = new Image();
    img.onload = async () => {
      showLoading(); // Show loading state for image
      // Use fallback detection (motion for image not needed)
      const antDetected = detectAntsFallbackImage(img);
      showResults([antDetected], 1);
    };
    img.src = URL.createObjectURL(file);

  } else if (file.type.startsWith('video/')) {
    video.style.display = "block";
    video.src = URL.createObjectURL(file);

    video.addEventListener('loadedmetadata', async () => {
      showLoading(); // Show loading state for video
      const frameInterval = 1; // 1 frame per second
      const totalFrames = Math.floor(video.duration / frameInterval);
      const countsPerFrame = [];

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      let prevFrameData = null;

      for (let i = 0; i < totalFrames; i++) {
        video.currentTime = i * frameInterval;
        await new Promise(res => video.addEventListener('seeked', res, { once: true }));

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frameData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        let count = 0;

        // Use motion detection as fallback
        if (prevFrameData) count = detectMotion(prevFrameData, frameData, canvas.width, canvas.height);
        prevFrameData = frameData.data;

        // Optional: also call API (uncomment if API key available)
        // const apiCount = await detectAntsAPI(canvas.toDataURL('image/jpeg'));
        // if(apiCount > 0) count = apiCount;

        countsPerFrame.push(count);
      }

      showResults(countsPerFrame, totalFrames);
    }, { once: true });
  } else {
    showError("Unsupported file type. Please upload an image or video.");
  }
});

// Display results and chart
function showResults(countsPerFrame, totalFrames) {
  const totalAntsDetected = countsPerFrame.reduce((a, b) => a + b, 0);
  const framesWithAnts = countsPerFrame.filter(c => c > 0).length;
  const averageAntsPerFrame = totalAntsDetected / totalFrames;
  
  // Enhanced analysis with fun insights
  let activityLevel = "Low";
  let funnyAction = "Ants are resting 😴";
  let confidence = "Medium";
  
  if (framesWithAnts > totalFrames * 0.8) {
    activityLevel = "Very High";
    funnyAction = "Ants are having a party! 🎉";
    confidence = "High";
  } else if (framesWithAnts > totalFrames * 0.6) {
    activityLevel = "High";
    funnyAction = "Ants are working hard! 💪";
    confidence = "High";
  } else if (framesWithAnts > totalFrames * 0.4) {
    activityLevel = "Medium";
    funnyAction = "Ants are moderately active 🐜";
    confidence = "Medium";
  } else if (framesWithAnts > totalFrames * 0.2) {
    activityLevel = "Low";
    funnyAction = "Ants are taking it easy 😌";
    confidence = "Medium";
  } else {
    activityLevel = "Very Low";
    funnyAction = "Ants are sleeping or hiding 😴";
    confidence = "Low";
  }

  document.getElementById('results').innerHTML = `
    <div style="text-align: left; max-width: 500px; margin: 0 auto;">
      <h4 style="color: #ff6b35; margin-bottom: 15px;">📊 Analysis Results</h4>
      
      <div style="background: rgba(255, 255, 255, 0.1); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
        <strong>🔢 Count Summary:</strong><br>
        • Total frames analyzed: ${totalFrames}<br>
        • Frames with ants detected: ${framesWithAnts}<br>
        • Total ants detected (estimated): ${totalAntsDetected}<br>
        • Average ants per frame: ${averageAntsPerFrame.toFixed(1)}
      </div>
      
      <div style="background: rgba(255, 107, 53, 0.2); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
        <strong>🎯 Activity Analysis:</strong><br>
        • Activity level: ${activityLevel}<br>
        • Fun observation: ${funnyAction}<br>
        • Detection confidence: ${confidence}
      </div>
      
      <div style="background: rgba(96, 165, 250, 0.2); padding: 15px; border-radius: 10px;">
        <strong>💡 Tips:</strong><br>
        • For more accurate results, use clear, well-lit images<br>
        • Videos with steady camera work best<br>
        • Multiple ants close together may be counted as one
      </div>
    </div>
  `;

  // Enhanced chart with better styling
  const chartCtx = document.getElementById('chart').getContext('2d');
  new Chart(chartCtx, {
    type: 'bar',
    data: {
      labels: ['Frames with Ants', 'Frames without Ants'],
      datasets: [{
        label: 'Frame Count',
        data: [framesWithAnts, totalFrames - framesWithAnts],
        backgroundColor: [
          'rgba(255, 107, 53, 0.8)',
          'rgba(96, 165, 250, 0.8)'
        ],
        borderColor: [
          'rgba(255, 107, 53, 1)',
          'rgba(96, 165, 250, 1)'
        ],
        borderWidth: 2,
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { 
          display: false 
        },
        title: {
          display: true,
          text: 'Ant Detection Analysis',
          color: '#ffffff',
          font: {
            size: 16,
            weight: 'bold'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff'
          }
        },
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#ffffff'
          }
        }
      }
    }
  });
}
