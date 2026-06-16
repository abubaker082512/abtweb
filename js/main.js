document.addEventListener('DOMContentLoaded', () => {
    
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
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('header-scrolled');
        } else {
            header.classList.remove('header-scrolled');
        }
    });


    // --- 3. MOBILE MENU TOGGLE ---
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
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
        let selectedBudget = '$5,000 - $10,000';
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
            '$5,000 - $10,000',
            '$10,000 - $25,000',
            '$25,000 - $50,000',
            '$50,000 - $100,000',
            '$100,000+'
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
                    const clientMessage = document.getElementById('clientMsg').value.trim();
                    
                    if (!clientName) {
                        alert('Please enter your name.');
                        return;
                    }
                    if (!clientEmail || !validateEmail(clientEmail)) {
                        alert('Please enter a valid email address.');
                        return;
                    }
                    if (!clientMessage) {
                        alert('Please provide a brief details summary of your project requirements.');
                        return;
                    }
                    
                    // Trigger Simulated submit
                    submitProjectPlanner(clientName, clientEmail, clientMessage);
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
        
        function submitProjectPlanner(name, email, msg) {
            // Show loading animation on the button
            nextBtn.disabled = true;
            nextBtn.innerText = 'Sending Request...';
            
            // Simulate API request timeout
            setTimeout(() => {
                // Clear form card contents and show success box
                plannerForm.style.display = 'none';
                successBox.style.display = 'block';
                
                // Log details to console (simulating server log receipt)
                console.log('--- PROJECT ESTIMATE SUBMISSION RECEIVED ---');
                console.log(`Name: ${name}`);
                console.log(`Email: ${email}`);
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
                if (scaleVal === '50000' || totalOnetime >= 100000) {
                    budgetIdx = 4;
                } else if (totalOnetime >= 50000) {
                    budgetIdx = 3;
                } else if (totalOnetime >= 25000) {
                    budgetIdx = 2;
                } else if (totalOnetime >= 10000) {
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
});
