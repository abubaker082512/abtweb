// Check theme preference instantly to prevent flash of light theme
(function() {
    const savedTheme = localStorage.getItem('abt_theme');
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        // If document.body is already parsed, apply to body as well
        if (document.body) {
            document.body.classList.add('dark-theme');
        }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Sync body class with html element if theme check applied early
    if (document.documentElement.classList.contains('dark-theme')) {
        document.body.classList.add('dark-theme');
    }

    // --- 0. THEME SWITCHER INJECTION & LOGO SWAP ---
    const logoImgs = document.querySelectorAll('.logo-img, .admin-login-logo, .sidebar-logo');
    function updateLogo(isDark) {
        logoImgs.forEach(img => {
            if (isDark) {
                img.src = 'Branding/ABT%20IT%20NEW%20LOGO%20White.png';
            } else {
                img.src = 'Branding/ABT%20IT%20NEW%20LOGO.png';
            }
        });
    }

    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const themeBtn = document.createElement('button');
    themeBtn.className = 'theme-toggle-btn';
    themeBtn.setAttribute('aria-label', 'Toggle Theme');
    themeBtn.innerHTML = `
        <svg class="theme-icon sun-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <svg class="theme-icon moon-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    `;
    
    if (mobileToggle) {
        mobileToggle.parentNode.insertBefore(themeBtn, mobileToggle);
    } else {
        const navContainer = document.querySelector('.nav-container');
        if (navContainer) {
            navContainer.appendChild(themeBtn);
        }
    }
    
    // Initial logo check
    updateLogo(document.body.classList.contains('dark-theme'));
    
    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        document.documentElement.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('abt_theme', isDark ? 'dark' : 'light');
        updateLogo(isDark);
    });

    // --- 0a. SCROLL PROGRESS BAR ---
    const scrollBar = document.createElement('div');
    scrollBar.className = 'scroll-progress-bar';
    document.body.appendChild(scrollBar);
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        scrollBar.style.width = `${scrollPercent}%`;
    });

    // --- 0b. CARD HOVER GLOWS ---
    const cards = document.querySelectorAll('.glass-panel');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // --- 0c. MAGNETIC BUTTON PULL EFFECT ---
    const magneticItems = document.querySelectorAll('.btn, .whatsapp-float-btn, .theme-toggle-btn');
    magneticItems.forEach(item => {
        item.addEventListener('mousemove', (e) => {
            const rect = item.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            item.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
        });
        item.addEventListener('mouseleave', () => {
            item.style.transform = '';
        });
    });

    // --- 0d. HERO TYPEWRITER EFFECT ---
    const typedSpan = document.getElementById('typedText');
    if (typedSpan) {
        const phrases = [
            'Elite Custom Software',
            'AI & SaaS Systems',
            'High-Performance Mobile Apps',
            'DevOps & Cloud Systems',
            'Scalable Tech Architectures'
        ];
        let phraseIndex = 0;
        let charIndex = phrases[0].length;
        let isDeleting = true; // Start by erasing placeholder after a delay
        let typingSpeed = 100;
        
        function type() {
            const currentPhrase = phrases[phraseIndex];
            
            if (isDeleting) {
                typedSpan.textContent = currentPhrase.substring(0, charIndex - 1);
                charIndex--;
                typingSpeed = 50;
            } else {
                typedSpan.textContent = currentPhrase.substring(0, charIndex + 1);
                charIndex++;
                typingSpeed = 100;
            }
            
            if (!isDeleting && charIndex === currentPhrase.length) {
                isDeleting = true;
                typingSpeed = 2000; // Pause showing full phrase
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                phraseIndex = (phraseIndex + 1) % phrases.length;
                typingSpeed = 500; // Short pause before typing next
            }
            
            setTimeout(type, typingSpeed);
        }
        
        // Initial delay matches pause length before erasing starts
        setTimeout(type, 2000);
    }
    
    // --- 1. CURSOR GLOW EFFECT ---
    const cursorGlow = document.createElement('div');
    cursorGlow.classList.add('cursor-glow');
    document.body.appendChild(cursorGlow);

    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorGlow.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
        cursorGlow.style.opacity = '0';
    });

    // Smooth animation loop for the glow (lag/lerp effect)
    function animateGlow() {
        const dx = mouseX - glowX;
        const dy = mouseY - glowY;
        
        glowX += dx * 0.1;
        glowY += dy * 0.1;
        
        cursorGlow.style.left = `${glowX}px`;
        cursorGlow.style.top = `${glowY}px`;
        
        requestAnimationFrame(animateGlow);
    }
    animateGlow();


    // --- 2. HEADER SCROLL STATE ---
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('header-scrolled');
            } else {
                header.classList.remove('header-scrolled');
            }
        });
    }


    // --- 3. MOBILE MENU TOGGLE ---
    // (mobileToggle is already queried as a DOMContentLoaded global)
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('mobile-active');
            mobileToggle.innerHTML = navLinks.classList.contains('mobile-active') ? '✕' : '☰';
        });

        // Close menu when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('mobile-active');
                mobileToggle.innerHTML = '☰';
            });
        });
    }


    // --- 4. SCROLL TRIGGERED FADE-IN ---
    const observerOptions = {
        root: null,
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const fadeObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // If it is the stats section, run counters
                if (entry.target.classList.contains('stats-section')) {
                    startStatsCounters(entry.target);
                }
                
                observer.unobserve(entry.target); // Trigger once
            }
        });
    }, observerOptions);

    const animateElements = document.querySelectorAll('.animate-fade-in, .stats-section');
    animateElements.forEach(el => fadeObserver.observe(el));


    // --- 5. STATS COUNTER LOGIC ---
    let statsStarted = false;
    function startStatsCounters(section) {
        if (statsStarted) return;
        statsStarted = true;
        
        const counters = section.querySelectorAll('.stat-number');
        counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'), 10);
            const suffix = counter.getAttribute('data-suffix') || '';
            let count = 0;
            const duration = 2000; // 2 seconds total count animation
            const increment = target / (duration / 16); // ~60fps
            
            function updateCounter() {
                count += increment;
                if (count >= target) {
                    counter.innerText = target + suffix;
                } else {
                    counter.innerText = Math.floor(count) + suffix;
                    requestAnimationFrame(updateCounter);
                }
            }
            updateCounter();
        });
    }


    // --- 6. TECH STACK FILTER TABS ---
    const tabButtons = document.querySelectorAll('.tech-tab-btn');
    const tabContents = document.querySelectorAll('.tech-tab-content');

    if (tabButtons.length > 0) {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Toggle Buttons active class
                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Toggle Contents active class
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${targetTab}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
    }


    // --- 7. FAQ ACCORDION LOGIC ---
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const trigger = item.querySelector('.faq-trigger');
            const content = item.querySelector('.faq-content');
            
            trigger.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                
                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-content').style.maxHeight = null;
                    }
                });
                
                // Toggle current item
                if (isActive) {
                    item.classList.remove('active');
                    content.style.maxHeight = null;
                } else {
                    item.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });
        });
    }


    // --- 8. TESTIMONIALS SLIDER ---
    const slides = document.querySelectorAll('.testimonial-slide');
    const dotsContainer = document.querySelector('.testimonial-dots');
    
    if (slides.length > 0) {
        let currentSlide = 0;
        let slideInterval;
        
        // Generate navigation dots
        slides.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.classList.add('testimonial-dot');
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => goToSlide(index));
            dotsContainer.appendChild(dot);
        });
        
        const dots = document.querySelectorAll('.testimonial-dot');
        
        function showSlide(index) {
            slides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            
            slides[index].classList.add('active');
            dots[index].classList.add('active');
            currentSlide = index;
        }
        
        function nextSlide() {
            let next = (currentSlide + 1) % slides.length;
            showSlide(next);
        }
        
        function goToSlide(index) {
            showSlide(index);
            resetInterval();
        }
        
        function startInterval() {
            slideInterval = setInterval(nextSlide, 5000); // Change slide every 5s
        }
        
        function resetInterval() {
            clearInterval(slideInterval);
            startInterval();
        }
        
        // Init slideshow
        slides[0].classList.add('active');
        startInterval();
    }


    // --- 9. MULTI-STEP PLANNER FORM LOGIC ---
    const steps = document.querySelectorAll('.form-step');
    const indicators = document.querySelectorAll('.step-indicator');
    const progressBar = document.querySelector('.form-progress-bar');
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const plannerForm = document.getElementById('projectPlannerForm');
    const successBox = document.getElementById('formSuccessBox');

    if (plannerForm) {
        let currentStepIndex = 0;
        
        // Selected values tracking
        let selectedServices = [];
        let selectedBudget = '$500 - $2,000';
        let selectedTimeline = '1-3 Months';
        
        // 9a. Step 1: Service Selection cards
        const serviceCards = document.querySelectorAll('.service-select-card');
        serviceCards.forEach(card => {
            card.addEventListener('click', () => {
                card.classList.toggle('selected');
                const serviceVal = card.getAttribute('data-service');
                
                if (card.classList.contains('selected')) {
                    if (!selectedServices.includes(serviceVal)) {
                        selectedServices.push(serviceVal);
                    }
                } else {
                    selectedServices = selectedServices.filter(s => s !== serviceVal);
                }
            });
        });

        // 9b. Step 2: Budget Slider
        const budgetSlider = document.getElementById('budgetRange');
        const budgetDisplay = document.getElementById('budgetValueDisplay');
        const budgets = [
            '$500 - $2,000',
            '$2,000 - $5,000',
            '$5,000 - $15,000',
            '$15,000 - $35,000',
            '$35,000+'
        ];
        
        if (budgetSlider && budgetDisplay) {
            budgetSlider.addEventListener('input', () => {
                const idx = parseInt(budgetSlider.value, 10);
                selectedBudget = budgets[idx];
                budgetDisplay.innerText = selectedBudget;
            });
        }

        // 9c. Step 3: Timeline selections
        const timelineCards = document.querySelectorAll('.tile-select-card');
        timelineCards.forEach(card => {
            card.addEventListener('click', () => {
                timelineCards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                selectedTimeline = card.getAttribute('data-timeline');
            });
        });

        // Update indicators & buttons display
        function updateFormLayout() {
            // Display active step panel
            steps.forEach((step, idx) => {
                step.classList.toggle('active', idx === currentStepIndex);
            });
            
            // Display active indicators
            indicators.forEach((indicator, idx) => {
                indicator.classList.toggle('active', idx === currentStepIndex);
                indicator.classList.toggle('completed', idx < currentStepIndex);
            });
            
            // Update progress line length
            const progressPercentage = (currentStepIndex / (steps.length - 1)) * 100;
            if (progressBar) progressBar.style.width = `${progressPercentage}%`;
            
            // Toggle previous button
            if (prevBtn) {
                prevBtn.style.display = currentStepIndex === 0 ? 'none' : 'inline-flex';
            }
            
            // Adjust Next button label
            if (nextBtn) {
                if (currentStepIndex === steps.length - 1) {
                    nextBtn.innerText = 'Submit Request';
                } else {
                    nextBtn.innerText = 'Next Step';
                }
            }
        }
        
        // Navigation events
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                // Perform validation check per step
                if (currentStepIndex === 0 && selectedServices.length === 0) {
                    alert('Please select at least one service to proceed.');
                    return;
                }
                
                if (currentStepIndex === steps.length - 1) {
                    // Final submission step validation
                    const clientName = document.getElementById('clientName').value.trim();
                    const clientEmail = document.getElementById('clientEmail').value.trim();
                    const clientPhone = document.getElementById('clientPhone').value.trim();
                    const clientMessage = document.getElementById('clientMsg').value.trim();
                    
                    if (!clientName) {
                        alert('Please enter your name.');
                        return;
                    }
                    if (!clientEmail || !validateEmail(clientEmail)) {
                        alert('Please enter a valid email address.');
                        return;
                    }
                    if (!clientPhone) {
                        alert('Please enter your Phone or WhatsApp number.');
                        return;
                    }
                    if (!clientMessage) {
                        alert('Please provide a brief details summary of your project requirements.');
                        return;
                    }
                    
                    // Trigger Simulated submit
                    submitProjectPlanner(clientName, clientEmail, clientPhone, clientMessage);
                } else {
                    currentStepIndex++;
                    updateFormLayout();
                }
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentStepIndex > 0) {
                    currentStepIndex--;
                    updateFormLayout();
                }
            });
        }
        
        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(String(email).toLowerCase());
        }
        
        function submitProjectPlanner(name, email, phone, msg) {
            // Show loading animation on the button
            nextBtn.disabled = true;
            nextBtn.innerText = 'Sending Request...';
            
            // Simulate API request timeout
            setTimeout(() => {
                // Save lead details to LocalStorage database
                try {
                    const database = JSON.parse(localStorage.getItem('abt_leads_database')) || [];
                    const newLead = {
                        id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 4),
                        timestamp: new Date().toISOString(),
                        source: 'Project Planner',
                        name: name,
                        email: email,
                        phone: phone,
                        service: selectedServices.join(', ') || 'Custom Solution',
                        budget: selectedBudget || 'Custom Range'
                    };
                    database.push(newLead);
                    localStorage.setItem('abt_leads_database', JSON.stringify(database));
                } catch (e) {
                    console.error('Failed to write planner lead to localStorage database:', e);
                }

                // Clear form card contents and show success box
                plannerForm.style.display = 'none';
                successBox.style.display = 'block';
                
                // Log details to console (simulating server log receipt)
                console.log('--- PROJECT ESTIMATE SUBMISSION RECEIVED ---');
                console.log(`Name: ${name}`);
                console.log(`Email: ${email}`);
                console.log(`Phone: ${phone}`);
                console.log(`Services requested: ${selectedServices.join(', ')}`);
                console.log(`Budget estimation: ${selectedBudget}`);
                console.log(`Timeline: ${selectedTimeline}`);
                console.log(`Details: ${msg}`);
                console.log('---------------------------------------------');
            }, 1800);
        }
        
        // Run initial form setup layout
        updateFormLayout();

        // --- 9d. PREFILL FROM ESTIMATOR REDIRECT ---
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('source') === 'calculator') {
            const scaleVal = urlParams.get('scale');
            const onetime = urlParams.get('onetime') ? urlParams.get('onetime').split(',') : [];
            const monthly = urlParams.get('monthly') ? urlParams.get('monthly').split(',') : [];
            const totalOnetime = parseFloat(urlParams.get('totalOnetime') || '0');
            const totalMonthly = parseFloat(urlParams.get('totalMonthly') || '0');
            
            // Helper mapping from checkbox IDs to select card IDs
            const cardMap = {
                'addWeb': 'selCardWeb',
                'addMobile': 'selCardMobile',
                'addAI': 'selCardAI',
                'addERP': 'selCardERP',
                'addUX': 'selCardUIUX',
                'addDevOps': 'selCardDevOps',
                'addAPI': 'selCardBICRM',
                'addSEO': 'selCardMarketing',
                'addEcom': 'selCardAmazon',
                'addDev': 'selCardOutsourcing',
                'addCloud': 'selCardDevOps'
            };

            // Pre-select service cards based on calculator options
            selectedServices = [];
            [...onetime, ...monthly].forEach(id => {
                const cardId = cardMap[id];
                if (cardId) {
                    const cardEl = document.getElementById(cardId);
                    if (cardEl) {
                        cardEl.classList.add('selected');
                        const serviceVal = cardEl.getAttribute('data-service');
                        if (serviceVal && !selectedServices.includes(serviceVal)) {
                            selectedServices.push(serviceVal);
                        }
                    }
                }
            });

            // Set budget slider index based on calculated price
            const budgetRange = document.getElementById('budgetRange');
            const budgetValueDisplay = document.getElementById('budgetValueDisplay');
            if (budgetRange && budgetValueDisplay) {
                let budgetIdx = 0;
                if (scaleVal === '50000' || totalOnetime >= 35000) {
                    budgetIdx = 4;
                } else if (totalOnetime >= 15000) {
                    budgetIdx = 3;
                } else if (totalOnetime >= 5000) {
                    budgetIdx = 2;
                } else if (totalOnetime >= 2000) {
                    budgetIdx = 1;
                } else {
                    budgetIdx = 0;
                }
                budgetRange.value = budgetIdx;
                selectedBudget = budgets[budgetIdx];
                budgetValueDisplay.innerText = selectedBudget;
            }

            // Fill initial Project Description brief details
            const clientMsg = document.getElementById('clientMsg');
            if (clientMsg) {
                let servicesText = onetime.map(id => {
                    const card = document.getElementById(cardMap[id]);
                    return card ? card.getAttribute('data-service') : id;
                }).filter(Boolean).join(', ');
                
                let monthlyText = monthly.map(id => {
                    const card = document.getElementById(cardMap[id]);
                    return card ? card.getAttribute('data-service') : id;
                }).filter(Boolean).join(', ');

                let baseText = scaleVal === '50000' ? 'Enterprise (Unlimited)' : `$${parseFloat(scaleVal).toLocaleString()} USD`;
                let oneTimeFormatted = scaleVal === '50000' ? 'Custom Enterprise Quote' : `$${totalOnetime.toLocaleString()} USD`;
                let monthlyFormatted = `$${totalMonthly.toLocaleString()} / mo`;

                clientMsg.value = `Hello ABT IT team! I used your Cost Calculator and would like to request a consultation. Here are my project details:\n\n` +
                    `- Base Project Scope: ${baseText}\n` +
                    `- One-Time Technical Add-ons: ${servicesText || 'None'}\n` +
                    `- Monthly Retainers: ${monthlyText || 'None'}\n` +
                    `- Calculated One-time Price: ${oneTimeFormatted}\n` +
                    `- Calculated Monthly Retainer: ${monthlyFormatted}\n\n` +
                    `Looking forward to discussing this project with you!`;
            }
        }
    }

    // --- 10. INTERACTIVE COST CALCULATOR LOGIC (services.html) ---
    const scaleSlider = document.getElementById('projectScale');
    const sliderValBadge = document.getElementById('sliderVal');
    const outOneTime = document.getElementById('outOneTime');
    const outRecurring = document.getElementById('outRecurring');
    const calcCtaBtn = document.getElementById('calcCtaBtn');

    if (scaleSlider && outOneTime && outRecurring) {
        const oneTimeCheckboxes = [
            document.getElementById('addWeb'),
            document.getElementById('addMobile'),
            document.getElementById('addAI'),
            document.getElementById('addERP'),
            document.getElementById('addAPI'),
            document.getElementById('addUX'),
            document.getElementById('addDevOps')
        ];
        
        const monthlyCheckboxes = [
            document.getElementById('addSEO'),
            document.getElementById('addEcom'),
            document.getElementById('addDev'),
            document.getElementById('addCloud')
        ];

        function updateCalculator() {
            const baseScale = parseInt(scaleSlider.value, 10);
            const isMaxScale = (baseScale === 50000);
            
            // Update slider badge label
            if (isMaxScale) {
                if (sliderValBadge) sliderValBadge.innerText = "Enterprise (Unlimited)";
            } else {
                if (sliderValBadge) sliderValBadge.innerText = `$${baseScale.toLocaleString()} USD`;
            }

            // Sum One-time additions
            let oneTimeSum = isMaxScale ? 0 : baseScale;
            let selectedOnetimeIds = [];
            
            oneTimeCheckboxes.forEach(cb => {
                if (!cb) return;
                const parentCard = cb.closest('.checkbox-card');
                if (cb.checked) {
                    oneTimeSum += parseInt(cb.value, 10);
                    if (parentCard) parentCard.classList.add('checked');
                    selectedOnetimeIds.push(cb.id);
                } else {
                    if (parentCard) parentCard.classList.remove('checked');
                }
            });

            // Sum Monthly additions
            let monthlySum = 0;
            let selectedMonthlyIds = [];
            
            monthlyCheckboxes.forEach(cb => {
                if (!cb) return;
                const parentCard = cb.closest('.checkbox-card');
                if (cb.checked) {
                    monthlySum += parseInt(cb.value, 10);
                    if (parentCard) parentCard.classList.add('checked');
                    selectedMonthlyIds.push(cb.id);
                } else {
                    if (parentCard) parentCard.classList.remove('checked');
                }
            });

            // Update outputs
            if (isMaxScale) {
                outOneTime.innerText = "Custom Enterprise Quote";
            } else {
                outOneTime.innerText = `$${oneTimeSum.toLocaleString()} USD`;
            }
            
            outRecurring.innerText = `$${monthlySum.toLocaleString()} / mo`;

            return {
                baseScale,
                oneTimeSum,
                monthlySum,
                selectedOnetimeIds,
                selectedMonthlyIds
            };
        }

        // Add event listeners
        scaleSlider.addEventListener('input', updateCalculator);
        [...oneTimeCheckboxes, ...monthlyCheckboxes].forEach(cb => {
            if (cb) cb.addEventListener('change', updateCalculator);
        });

        // Initialize display
        updateCalculator();

        // Bind click events to redirect to contact.html with prefill parameter data
        if (calcCtaBtn) {
            calcCtaBtn.addEventListener('click', () => {
                const calcState = updateCalculator();
                const scale = calcState.baseScale;
                const onetime = calcState.selectedOnetimeIds.join(',');
                const monthly = calcState.selectedMonthlyIds.join(',');
                const oneTimeTotal = calcState.oneTimeSum;
                const monthlyTotal = calcState.monthlySum;

                window.location.href = `contact.html?source=calculator&scale=${scale}&onetime=${encodeURIComponent(onetime)}&monthly=${encodeURIComponent(monthly)}&totalOnetime=${oneTimeTotal}&totalMonthly=${monthlyTotal}`;
            });
        }
    }

    // --- 11. CONVERSATIONAL LEAD CATCHER CHATBOT WIDGET ---
    (function initChatbot() {
        // Create elements
        const chatContainer = document.createElement('div');
        chatContainer.className = 'chatbot-container';
        chatContainer.innerHTML = `
            <div class="chatbot-badge" id="chatBadge">👋 Need a project estimate?</div>
            <button class="chatbot-trigger" id="chatTrigger" aria-label="Open chat assistant">
                <div class="chatbot-pulse-ring"></div>
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </button>
            <div class="chatbot-window" id="chatWindow">
                <div class="chatbot-header">
                    <div class="chatbot-avatar"></div>
                    <div class="chatbot-header-info">
                        <div class="chatbot-header-name">ABT IT Coordinator</div>
                        <div class="chatbot-header-status">Online • Instant Estimate</div>
                    </div>
                    <button class="chatbot-close-btn" id="chatCloseBtn">&times;</button>
                </div>
                <div class="chatbot-body" id="chatBody"></div>
                <div class="chatbot-input-area">
                    <input type="text" class="chatbot-input" id="chatInput" placeholder="Type name / email here..." disabled>
                    <button class="chatbot-send-btn" id="chatSendBtn" disabled>
                        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(chatContainer);

        const badge = document.getElementById('chatBadge');
        const trigger = document.getElementById('chatTrigger');
        const windowEl = document.getElementById('chatWindow');
        const closeBtn = document.getElementById('chatCloseBtn');
        const chatBody = document.getElementById('chatBody');
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('chatSendBtn');

        let chatState = 0; // 0: Greeting/Start, 1: Service Type selection, 2: Budget selection, 3: Name request, 4: Email request, 5: Completed
        let userAnswers = {
            service: '',
            budget: '',
            name: '',
            email: ''
        };

        // Open/Close toggle
        trigger.addEventListener('click', () => {
            const isActive = windowEl.classList.contains('active');
            if (isActive) {
                closeChat();
            } else {
                openChat();
            }
        });

        closeBtn.addEventListener('click', closeChat);

        function openChat() {
            windowEl.classList.add('active');
            trigger.classList.add('active');
            badge.classList.remove('visible');
            sessionStorage.setItem('chatBotOpened', 'true');
            if (chatBody.children.length === 0) {
                startBotConversation();
            }
        }

        function closeChat() {
            windowEl.classList.remove('active');
            trigger.classList.remove('active');
            sessionStorage.setItem('chatBotDismissed', 'true');
        }

        // Auto-catcher behaviors
        setTimeout(() => {
            // Show badge notification after 3 seconds if never opened
            if (!sessionStorage.getItem('chatBotOpened')) {
                badge.classList.add('visible');
            }
        }, 3000);

        setTimeout(() => {
            // Automatically open chat widget after 7 seconds if never opened and not dismissed
            if (!sessionStorage.getItem('chatBotOpened') && !sessionStorage.getItem('chatBotDismissed')) {
                openChat();
            }
        }, 7000);

        // Chat logic
        function appendBotMessage(text) {
            const msg = document.createElement('div');
            msg.className = 'chatbot-msg bot';
            msg.innerText = text;
            chatBody.appendChild(msg);
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        function appendUserMessage(text) {
            const msg = document.createElement('div');
            msg.className = 'chatbot-msg user';
            msg.innerText = text;
            chatBody.appendChild(msg);
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        function appendOptions(options, callback) {
            const container = document.createElement('div');
            container.className = 'chatbot-options-container';
            options.forEach(opt => {
                const btn = document.createElement('button');
                btn.className = 'chatbot-opt-btn';
                btn.innerText = opt;
                btn.addEventListener('click', () => {
                    container.remove();
                    callback(opt);
                });
                container.appendChild(btn);
            });
            chatBody.appendChild(container);
            chatBody.scrollTop = chatBody.scrollHeight;
        }

        function startBotConversation() {
            appendBotMessage("Hello! 👋 Welcome to ABT IT Innovations.");
            enableInput("Ask a question or start proposal...");
            setTimeout(() => {
                appendBotMessage("Would you like a custom proposal and estimate for your software project? It takes less than 60 seconds!");
                setTimeout(() => {
                    appendOptions(["Yes, let's start!", "No, thank you."], (choice) => {
                        appendUserMessage(choice);
                        if (choice === "Yes, let's start!") {
                            chatState = 1;
                            setTimeout(askServiceType, 500);
                        } else {
                            appendBotMessage("No problem! Let me know if you need anything. Feel free to explore our services.");
                        }
                    });
                }, 600);
            }, 600);
        }

        function askServiceType() {
            enableInput("Type service or ask a question...");
            appendBotMessage("Great! What type of software system are we building?");
            setTimeout(() => {
                const services = ["Custom Web App", "Mobile App (iOS/Android)", "AI & SaaS Systems", "Shopify / E-commerce", "Enterprise ERP / CRM"];
                appendOptions(services, (choice) => {
                    appendUserMessage(choice);
                    userAnswers.service = choice;
                    chatState = 2;
                    setTimeout(askBudget, 500);
                });
            }, 500);
        }

        function askBudget() {
            enableInput("Type budget or ask a question...");
            appendBotMessage("Perfect. What is your estimated budget scope for this project?");
            setTimeout(() => {
                const budgetsList = ["Under $500 USD", "$500 - $2,000", "$2,000 - $5,000", "Enterprise ($5,000+)"];
                appendOptions(budgetsList, (choice) => {
                    appendUserMessage(choice);
                    userAnswers.budget = choice;
                    chatState = 3;
                    setTimeout(askName, 500);
                });
            }, 500);
        }

        // Enable/Disable keyboard inputs
        function enableInput(placeholder) {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.placeholder = placeholder;
            chatInput.focus();
        }

        function disableInput() {
            chatInput.value = '';
            chatInput.disabled = true;
            sendBtn.disabled = true;
            chatInput.placeholder = 'Type name / email here...';
        }

        function askName() {
            appendBotMessage("Understood! What is your full name?");
            setTimeout(() => {
                enableInput("Enter your name...");
            }, 400);
        }

        function handleUserInput() {
            const val = chatInput.value.trim();
            if (!val) return;

            if (chatState === 3) {
                appendUserMessage(val);
                userAnswers.name = val;
                disableInput();
                chatState = 4;
                setTimeout(() => {
                    appendBotMessage(`Nice to meet you, ${val}! And what is your business email address?`);
                    setTimeout(() => {
                        enableInput("Enter your email address...");
                    }, 400);
                }, 600);
            } else if (chatState === 4) {
                if (validateEmail(val)) {
                    appendUserMessage(val);
                    userAnswers.email = val;
                    disableInput();
                    chatState = 5;
                    setTimeout(() => {
                        appendBotMessage(`Perfect! Lastly, what is your Phone or WhatsApp Number?`);
                        setTimeout(() => {
                            enableInput("Enter your Phone or WhatsApp...");
                        }, 400);
                    }, 600);
                } else {
                    appendBotMessage("Oops! That email address doesn't look valid. Please enter a valid email address (e.g. name@company.com):");
                }
            } else if (chatState === 5) {
                if (val.length >= 7) {
                    appendUserMessage(val);
                    userAnswers.phone = val;
                    disableInput();
                    chatState = 6;
                    setTimeout(completeLeadCapture, 600);
                } else {
                    appendBotMessage("Please enter a valid Phone or WhatsApp number (at least 7 characters):");
                }
            } else {
                // Free-text query or start intent when not in capturing states
                appendUserMessage(val);
                chatInput.value = '';
                processNLPQuery(val);
            }
        }

        function processNLPQuery(query) {
            const q = query.toLowerCase();

            // 1. Check if they want to start the lead capture flow
            if (chatState === 0 && (q.includes('yes') || q.includes('start') || q.includes('proposal') || q.includes('estimate') || q.includes('begin'))) {
                chatState = 1;
                // Remove any option buttons on screen
                const existingOptions = chatBody.querySelectorAll('.chatbot-options-container');
                existingOptions.forEach(el => el.remove());
                setTimeout(askServiceType, 400);
                return;
            }

            // 2. Check if they are answering service selection in State 1
            if (chatState === 1) {
                const services = ["custom web app", "mobile app (ios/android)", "ai & saas systems", "shopify / e-commerce", "enterprise erp / crm"];
                const matchedService = services.find(s => q.includes(s) || s.includes(q));
                if (matchedService) {
                    const titleMap = {
                        "custom web app": "Custom Web App",
                        "mobile app (ios/android)": "Mobile App (iOS/Android)",
                        "ai & saas systems": "AI & SaaS Systems",
                        "shopify / e-commerce": "Shopify / E-commerce",
                        "enterprise erp / crm": "Enterprise ERP / CRM"
                    };
                    userAnswers.service = titleMap[matchedService];
                    chatState = 2;
                    const existingOptions = chatBody.querySelectorAll('.chatbot-options-container');
                    existingOptions.forEach(el => el.remove());
                    appendBotMessage(`Selected service: ${userAnswers.service}`);
                    setTimeout(askBudget, 500);
                    return;
                }
            }

            // 3. Check if they are answering budget in State 2
            if (chatState === 2) {
                const budgetsList = ["under $500 usd", "$500 - $2,000", "$2,000 - $5,000", "enterprise ($5,000+)"];
                const matchedBudget = budgetsList.find(b => q.includes(b.replace(/[$,+]/g, '').toLowerCase()) || q.includes('under 500') || q.includes('500') || q.includes('2000') || q.includes('5000') || q.includes('enterprise'));
                if (matchedBudget) {
                    userAnswers.budget = matchedBudget === "under $500 usd" ? "Under $500 USD" :
                                         matchedBudget === "$500 - $2,000" ? "$500 - $2,000" :
                                         matchedBudget === "$2,000 - $5,000" ? "$2,000 - $5,000" : "Enterprise ($5,000+)";
                    chatState = 3;
                    const existingOptions = chatBody.querySelectorAll('.chatbot-options-container');
                    existingOptions.forEach(el => el.remove());
                    appendBotMessage(`Selected budget: ${userAnswers.budget}`);
                    setTimeout(askName, 500);
                    return;
                }
            }

            // 4. Keyword matches for corporate knowledge base
            
            // Offices
            if (q.includes('office') || q.includes('location') || q.includes('where are') || q.includes('islamabad') || q.includes('london') || q.includes('miami') || q.includes('pakistan') || q.includes('florida') || q.includes('uk') || q.includes('address') || q.includes('country') || q.includes('countries') || q.includes('cities')) {
                setTimeout(() => {
                    appendBotMessage("ABT IT Innovations operates globally to coordinate with our clients:\n\n🏢 Main Engineering HQ: Islamabad, Pakistan\n🏢 Client Office (UK): London, UK\n🏢 Client Office (US): Miami, Florida\n\nOur engineering is centralized in Islamabad to leverage top-tier technical talent while maintaining local business touchpoints in the UK and US.");
                }, 400);
                return;
            }

            // Services / Technologies
            if (q.includes('service') || q.includes('what do you') || q.includes('web') || q.includes('mobile') || q.includes('app') || q.includes('ios') || q.includes('android') || q.includes('ai') || q.includes('saas') || q.includes('seo') || q.includes('marketing') || q.includes('devops') || q.includes('erp') || q.includes('crm') || q.includes('shopify') || q.includes('woocommerce') || q.includes('api') || q.includes('e-commerce') || q.includes('ecommerce') || q.includes('tech') || q.includes('stack') || q.includes('react') || q.includes('node') || q.includes('python') || q.includes('flutter') || q.includes('php') || q.includes('aws')) {
                setTimeout(() => {
                    appendBotMessage("We provide complete software engineering and digital marketing services, including:\n\n💻 Custom Web App Development (React, Node.js, Python, PHP)\n📱 Mobile Apps (iOS & Android via Flutter/native)\n🤖 AI & SaaS Systems integration\n🔌 API & Third-party integrations\n🛒 E-commerce Stores (Shopify & WooCommerce experts)\n📈 Advanced SEO & Digital Marketing to rank your business");
                }, 400);
                return;
            }

            // Projects / Portfolio / Clients
            if (q.includes('project') || q.includes('client') || q.includes('portfolio') || q.includes('work') || q.includes('akhuwat') || q.includes('ozo') || q.includes('trips') || q.includes('bssole') || q.includes('royal') || q.includes('umrah') || q.includes('habib') || q.includes('hujjaj')) {
                setTimeout(() => {
                    appendBotMessage("We have built products for reputable clients worldwide, including:\n\n🤝 Akhuwat: Microfinance application and portal system.\n🥾 BSSole: Premium custom e-commerce footwear store.\n✈️ Ozo Trips: Dynamic travel and tourism booking web app.\n🕋 Royal Umrah: Online packages reservation portal.\n🕌 Habibulhujjaj: End-to-end Hajj service coordination system.");
                }, 400);
                return;
            }

            // Methodology
            if (q.includes('method') || q.includes('process') || q.includes('how do you work') || q.includes('agile') || q.includes('scrum') || q.includes('sprint') || q.includes('qa') || q.includes('testing') || q.includes('deliver') || q.includes('quality')) {
                setTimeout(() => {
                    appendBotMessage("We utilize an Agile scrum development methodology:\n\n1️⃣ Requirement Analysis & scoping.\n2️⃣ Sprint planning & prototype wireframing.\n3️⃣ Iterative development with continuous updates.\n4️⃣ Multi-device QA testing.\n5️⃣ Deployment and 24/7 post-launch support.");
                }, 400);
                return;
            }

            // Pricing / Cost
            if (q.includes('price') || q.includes('cost') || q.includes('budget') || q.includes('rate') || q.includes('pricing') || q.includes('calculator') || q.includes('how much') || q.includes('fee')) {
                setTimeout(() => {
                    appendBotMessage("Our software projects start from a minimum budget of $500 USD (e.g. for custom web or mobile modules) and scale up to enterprise-level software. You can get an instant estimate using our interactive Cost Calculator on the Services page, or choose 'Yes, let's start!' in this chat to request a custom proposal.");
                }, 400);
                return;
            }

            // Contact / Email
            if (q.includes('contact') || q.includes('email') || q.includes('phone') || q.includes('reach') || q.includes('call') || q.includes('address') || q.includes('write to') || q.includes('mail')) {
                setTimeout(() => {
                    appendBotMessage("You can contact us in multiple ways:\n\n📧 Email: info@abtit.co or contact@abtit.co\n📝 Contact Form: Fill out the planner on our Contact page\n💬 Lead Assistant: Type 'Yes, let's start!' in this chat to leave your details.");
                }, 400);
                return;
            }

            // About the company
            if (q.includes('about') || q.includes('who are you') || q.includes('company') || q.includes('abt') || q.includes('agency') || q.includes('firm') || q.includes('history')) {
                setTimeout(() => {
                    appendBotMessage("ABT IT Innovations is a premium global software development and digital transformation agency. We design, build, and scale custom software, mobile apps, AI systems, and e-commerce platforms for startups and enterprise clients, backed by a world-class team based in Islamabad, London, and Miami.");
                }, 400);
                return;
            }

            // 5. Fallback - Polite Company-Only Boundary Message
            setTimeout(() => {
                appendBotMessage("I am the ABT IT Innovations assistant and can only answer questions related to our company, services, projects, offices, and technologies. How can I help you with your software development needs today?");
            }, 400);
        }

        function validateEmail(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(String(email).toLowerCase());
        }

        function completeLeadCapture() {
            appendBotMessage(`Thank you, ${userAnswers.name}! 🎉`);
            setTimeout(() => {
                // Save lead details to LocalStorage database
                try {
                    const database = JSON.parse(localStorage.getItem('abt_leads_database')) || [];
                    const newLead = {
                        id: 'lead_' + Date.now() + Math.random().toString(36).substr(2, 4),
                        timestamp: new Date().toISOString(),
                        source: 'Chatbot',
                        name: userAnswers.name,
                        email: userAnswers.email,
                        phone: userAnswers.phone || 'N/A',
                        service: userAnswers.service || 'Custom Solution',
                        budget: userAnswers.budget || 'Custom Range'
                    };
                    database.push(newLead);
                    localStorage.setItem('abt_leads_database', JSON.stringify(database));
                } catch (e) {
                    console.error('Failed to write chatbot lead to localStorage database:', e);
                }

                appendBotMessage(`I've registered your interest for a ${userAnswers.service} within the budget of ${userAnswers.budget}.`);
                setTimeout(() => {
                    appendBotMessage(`Our tech coordinator based in Islamabad is compiling your proposal and will contact you at ${userAnswers.email} / ${userAnswers.phone} within 24 hours.`);
                    
                    setTimeout(() => {
                        enableInput("Ask anything about our company...");
                    }, 800);

                    // Log to console (simulating server log receipt)
                    console.log('--- CONVERSATIONAL LEAD CATCHER SUBMISSION ---');
                    console.log(`Name: ${userAnswers.name}`);
                    console.log(`Email: ${userAnswers.email}`);
                    console.log(`Phone: ${userAnswers.phone}`);
                    console.log(`System Type: ${userAnswers.service}`);
                    console.log(`Budget Range: ${userAnswers.budget}`);
                    console.log('----------------------------------------------');
                }, 800);
            }, 600);
        }

        // Keyboard enter and click event bindings
        sendBtn.addEventListener('click', handleUserInput);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleUserInput();
            }
        });
    })();

    // --- 11a. FLOATING WHATSAPP BUTTON ---
    (function initWhatsAppFloat() {
        const waBtn = document.createElement('a');
        waBtn.className = 'whatsapp-float-btn';
        waBtn.href = 'https://wa.me/923335954599';
        waBtn.target = '_blank';
        waBtn.setAttribute('aria-label', 'Chat on WhatsApp');
        waBtn.innerHTML = `
            <div class="whatsapp-pulse-ring"></div>
            <svg viewBox="0 0 24 24"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.333 4.982L2 22l5.233-1.371a9.92 9.92 0 0 0 4.778 1.226h.004c5.505 0 9.989-4.478 9.99-9.984A9.97 9.97 0 0 0 12.012 2zm5.748 14.124c-.241.678-1.205 1.258-1.657 1.353-.408.086-.938.163-3.11-.743-2.776-1.155-4.544-3.99-4.683-4.175-.138-.184-1.121-1.493-1.121-2.848 0-1.356.708-2.014.962-2.28.252-.266.551-.33.735-.33.184 0 .367.002.527.009.168.007.394-.063.618.478.225.542.766 1.868.832 2.001.066.134.11.291.02.469-.09.177-.134.291-.266.444-.132.154-.277.344-.396.463-.133.133-.271.278-.118.542.152.264.678 1.117 1.455 1.808.997.89 1.838 1.166 2.098 1.297.26.13.411.109.563-.067.153-.177.653-.761.826-1.02.174-.26.347-.217.584-.13.238.087 1.503.71 1.761.84.258.128.43.193.493.302.063.109.063.63-.178 1.309z"/></svg>
        `;
        document.body.appendChild(waBtn);
    })();
});
