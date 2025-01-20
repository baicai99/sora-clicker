// ==UserScript==
// @name         Sora's Advanced Auto Click Assistant
// @namespace    http://tampermonkey.net/
// @version      3.8
// @description  Create a panel to dynamically click multiple positions on a webpage with proportional coordinates
// @author       baicai99
// @match        *://sora.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let clickPoints = [];
    let activePointIndex = null;
    let countdownInterval = null;
    let nextClickTime = null;

    // 创建点击指示器
    const clickIndicator = document.createElement('div');
    clickIndicator.style.position = 'fixed';
    clickIndicator.style.pointerEvents = 'none';
    clickIndicator.style.zIndex = '2147483646';
    clickIndicator.style.border = '2px solid rgba(255, 0, 0, 0.5)';
    clickIndicator.style.borderRadius = '50%';
    clickIndicator.style.display = 'none';
    document.body.appendChild(clickIndicator);

    // Create panel UI with modifications
    const panel = document.createElement('div');
    panel.style.position = 'fixed';
    panel.style.bottom = '20px';
    panel.style.right = '20px';
    panel.style.width = '300px';
    panel.style.backgroundColor = 'rgb(55, 55, 55)';
    panel.style.color = '#fff';
    panel.style.padding = '10px';
    panel.style.borderRadius = '8px';
    panel.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    panel.style.zIndex = '2147483647';

    function createPointHTML(index) {
        return `
            <div id="point-${index}" class="click-point" style="margin-bottom: 10px; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <div>
                        <span style="font-weight: bold;">点击位置 ${index + 1}</span>
                        <button class="set-point-btn" data-index="${index}" style="margin-left: 10px; background: #666; border: none; color: #fff; padding: 2px 8px; border-radius: 3px; cursor: pointer;">设置位置</button>
                    </div>
                    <button class="remove-point" data-index="${index}" style="background: none; border: none; color: #ff4444; cursor: pointer;">×</button>
                </div>
                <div style="margin-bottom: 5px;">
                    <span>坐标：</span>
                    <span class="coordinates-display">未设置</span>
                </div>
            </div>
        `;
    }

    panel.innerHTML = `
        <div id="header" style="margin-bottom: 10px; cursor: move; display: flex; justify-content: space-between; align-items: center;">
            <span id="title" style="font-weight: bold;">多点自动点击助手</span>
            <button id="minimizeButton" style="background: none; border: none; color: #fff; font-size: 16px; cursor: pointer;">-</button>
        </div>
        <div id="instructions">
            <p style="margin: 0; font-size: 14px;">使用说明：</p>
            <ul style="margin: 5px 0 10px; padding-left: 20px; font-size: 12px;">
                <li>点击"+"添加新的点击位置</li>
                <li>点击"设置位置"按钮，然后使用鼠标中键设置坐标</li>
                <li>设置循环间隔和点击缓冲时间</li>
            </ul>
        </div>
        <div id="panelBody">
            <div id="activePointDisplay" style="margin-bottom: 10px; padding: 5px; background: rgba(0,255,0,0.1); border-radius: 4px; display: none;">
                正在设置点击位置 <span id="activePointNumber"></span>
            </div>
            <div id="clickPoints"></div>
            <button id="addPoint" style="width: 100%; padding: 8px; background-color: #444; color: #fff; border: none; border-radius: 4px; margin-bottom: 10px; cursor: pointer;">+ 添加点击位置</button>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 14px;">循环间隔（秒）：</label>
                <input id="cycleIntervalInput" type="text" placeholder="60" style="width: 60px; padding: 2px; border-radius: 4px; border: none; background-color: #2f2f2f; color: #fff;" />
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 14px;">点击缓冲（秒）：</label>
                <input id="clickBufferInput" type="text" placeholder="2" style="width: 60px; padding: 2px; border-radius: 4px; border: none; background-color: #2f2f2f; color: #fff;" />
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 14px;">抖动时间（秒）：</label>
                <input id="jitterInput" type="text" placeholder="10" style="width: 60px; padding: 2px; border-radius: 4px; border: none; background-color: #2f2f2f; color: #fff;" />
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 14px;">点击扩散范围（像素）：</label>
                <input id="spreadRadiusInput" type="text" placeholder="20" style="width: 60px; padding: 2px; border-radius: 4px; border: none; background-color: #2f2f2f; color: #fff;" />
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 14px;">循环次数：</label>
                <input id="totalLoopsInput" type="text" placeholder="10" style="width: 60px; padding: 2px; border-radius: 4px; border: none; background-color: #2f2f2f; color: #fff;" />
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 14px;">剩余次数：</label>
                <span id="remainingLoopsDisplay">未开始</span>
            </div>
            <div style="margin-bottom: 10px;">
                <label style="font-size: 14px;">下次点击倒计时：</label>
                <span id="remainingSecondsDisplay">未开始</span>
            </div>
            <button id="startButton" style="width: 100%; padding: 8px; background-color: #fff; color: #000; border-radius: 4px; font-size: 14px; cursor: pointer;">开始</button>
        </div>
    `;

    document.body.appendChild(panel);

    let isRunning = false;
    let remainingLoops = 0;
    let currentTimeout = null;

    // Add point functionality
    document.getElementById('addPoint').addEventListener('click', () => {
        const pointsContainer = document.getElementById('clickPoints');
        const newIndex = clickPoints.length;
        clickPoints.push({
            relativeX: null,
            relativeY: null
        });

        const pointElement = document.createElement('div');
        pointElement.innerHTML = createPointHTML(newIndex);
        pointsContainer.appendChild(pointElement);
    });

    // Handle point removal and set point buttons
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-point')) {
            const index = parseInt(e.target.dataset.index);
            clickPoints.splice(index, 1);
            refreshPointsDisplay();
        } else if (e.target.classList.contains('set-point-btn')) {
            document.querySelectorAll('.click-point').forEach(point => {
                point.style.background = 'rgba(255,255,255,0.1)';
            });

            const index = parseInt(e.target.dataset.index);
            activePointIndex = index;

            const activePointDisplay = document.getElementById('activePointDisplay');
            const activePointNumber = document.getElementById('activePointNumber');
            activePointDisplay.style.display = 'block';
            activePointNumber.textContent = (index + 1);

            const selectedPoint = document.getElementById(`point-${index}`);
            if (selectedPoint) {
                selectedPoint.style.background = 'rgba(0,255,0,0.2)';
            }
        }
    });

    function refreshPointsDisplay() {
        const pointsContainer = document.getElementById('clickPoints');
        pointsContainer.innerHTML = '';
        clickPoints.forEach((point, index) => {
            const pointElement = document.createElement('div');
            pointElement.innerHTML = createPointHTML(index);
            pointsContainer.appendChild(pointElement);

            if (point.relativeX !== null) {
                const coords = calculateProportionalCoordinates(point.relativeX, point.relativeY);
                pointElement.querySelector('.coordinates-display').textContent =
                    `(${coords.x}, ${coords.y}) [${Math.round(point.relativeX * 100)}%, ${Math.round(point.relativeY * 100)}%]`;
            }
        });
    }

    // Middle click to set coordinates
    document.addEventListener('mousedown', (e) => {
        if (e.button === 1 && activePointIndex !== null) {
            e.preventDefault();
            const relativeX = e.clientX / window.innerWidth;
            const relativeY = e.clientY / window.innerHeight;

            clickPoints[activePointIndex] = {
                ...clickPoints[activePointIndex],
                relativeX,
                relativeY
            };

            // 显示点击范围指示器
            const spreadRadius = parseInt(document.getElementById('spreadRadiusInput').value || '20');
            clickIndicator.style.display = 'block';
            clickIndicator.style.left = (e.clientX - spreadRadius) + 'px';
            clickIndicator.style.top = (e.clientY - spreadRadius) + 'px';
            clickIndicator.style.width = (spreadRadius * 2) + 'px';
            clickIndicator.style.height = (spreadRadius * 2) + 'px';

            setTimeout(() => {
                clickIndicator.style.display = 'none';
            }, 2000);

            refreshPointsDisplay();
            activePointIndex = null;
            document.getElementById('activePointDisplay').style.display = 'none';

            document.querySelectorAll('.click-point').forEach(point => {
                point.style.background = 'rgba(255,255,255,0.1)';
            });
        }
    });

    function calculateProportionalCoordinates(relativeX, relativeY) {
        return {
            x: Math.round(relativeX * window.innerWidth),
            y: Math.round(relativeY * window.innerHeight)
        };
    }

    function updateCountdown() {
        if (!nextClickTime || !isRunning) {
            document.getElementById('remainingSecondsDisplay').textContent = '未开始';
            return;
        }

        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((nextClickTime - now) / 1000));
        document.getElementById('remainingSecondsDisplay').textContent = `${remaining}秒`;
    }

    function clickPosition(relativeX, relativeY) {
        const baseCoords = calculateProportionalCoordinates(relativeX, relativeY);
        const spreadRadius = parseInt(document.getElementById('spreadRadiusInput').value || '20');

        // 计算随机扩散位置
        const angle = Math.random() * 2 * Math.PI;
        const distance = Math.random() * spreadRadius;
        const spreadX = Math.round(baseCoords.x + distance * Math.cos(angle));
        const spreadY = Math.round(baseCoords.y + distance * Math.sin(angle));

        // 显示点击范围指示器
        clickIndicator.style.display = 'block';
        clickIndicator.style.left = (baseCoords.x - spreadRadius) + 'px';
        clickIndicator.style.top = (baseCoords.y - spreadRadius) + 'px';
        clickIndicator.style.width = (spreadRadius * 2) + 'px';
        clickIndicator.style.height = (spreadRadius * 2) + 'px';

        setTimeout(() => {
            clickIndicator.style.display = 'none';
        }, 1000);

        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: spreadX,
            clientY: spreadY
        });

        const element = document.elementFromPoint(spreadX, spreadY);
        if (element) {
            element.dispatchEvent(event);
        }
    }

 async function executeClickSequence() {
    if (!isRunning) return;

    for (let i = 0; i < clickPoints.length; i++) {
        if (!isRunning) return;

        const point = clickPoints[i];
        if (point.relativeX !== null) {
            clickPosition(point.relativeX, point.relativeY);
        }

        if (i < clickPoints.length - 1) {
            const clickBuffer = parseFloat(document.getElementById('clickBufferInput').value || '2') * 1000;
            await new Promise(resolve => setTimeout(resolve, clickBuffer));
        }
    }

    remainingLoops--;
    document.getElementById('remainingLoopsDisplay').textContent = remainingLoops;

    if (remainingLoops <= 0) {
        isRunning = false;
        document.getElementById('startButton').textContent = '开始';
        document.getElementById('remainingLoopsDisplay').textContent = '未开始';
        document.getElementById('remainingSecondsDisplay').textContent = '未开始';
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        alert('循环任务已完成！');
        return;
    }

    const cycleInterval = parseFloat(document.getElementById('cycleIntervalInput').value || '60') * 1000;
    const jitterTime = parseFloat(document.getElementById('jitterInput').value || '10') * 1000;

    // 生成一个随机的抖动时间值（0到设定值之间）
    const randomJitterTime = Math.random() * jitterTime;
    // 将随机抖动时间添加到循环间隔上
    const nextInterval = cycleInterval + randomJitterTime;

    nextClickTime = Date.now() + nextInterval;
    currentTimeout = setTimeout(() => {
        executeClickSequence();
    }, nextInterval);
}

    // Start/stop functionality
    document.getElementById('startButton').addEventListener('click', () => {
        if (isRunning) {
            clearTimeout(currentTimeout);
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            isRunning = false;
            document.getElementById('startButton').textContent = '开始';
            document.getElementById('remainingLoopsDisplay').textContent = '未开始';
            document.getElementById('remainingSecondsDisplay').textContent = '未开始';
            nextClickTime = null;
        } else {
            if (clickPoints.length === 0 || !clickPoints.some(p => p.relativeX !== null)) {
                alert('请至少设置一个点击位置！');
                return;
            }

            const totalLoops = parseInt(document.getElementById('totalLoopsInput').value || '10');
            if (isNaN(totalLoops) || totalLoops <= 0) {
                alert('请输入有效的循环次数！');
                return;
            }

            remainingLoops = totalLoops;
            isRunning = true;
            document.getElementById('startButton').textContent = '停止';

            countdownInterval = setInterval(updateCountdown, 1000);

            executeClickSequence();
        }
    });

    // Minimize functionality
    document.getElementById('minimizeButton').addEventListener('click', () => {
        const panelBody = document.getElementById('panelBody');
        const instructions = document.getElementById('instructions');
        const minimizeButton = document.getElementById('minimizeButton');
        if (panelBody.style.display === 'none') {
            panelBody.style.display = 'block';
            instructions.style.display = 'block';
            minimizeButton.textContent = '-';
        } else {
            panelBody.style.display = 'none';
            instructions.style.display = 'none';
            minimizeButton.textContent = '+';
        }
    });

    // Make panel draggable
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    panel.addEventListener('mousedown', (e) => {
        if (e.target.closest('#header')) {
            isDragging = true;
            offsetX = e.clientX - panel.offsetLeft;
            offsetY = e.clientY - panel.offsetTop;
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
            panel.style.bottom = 'auto';
            panel.style.right = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Refresh coordinates on window resize
    window.addEventListener('resize', refreshPointsDisplay);
})();