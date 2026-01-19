import React, { useEffect, useRef, useState } from 'react';

const Navbar = () => {
  const navRef = useRef(null);
  const menuItemsRef = useRef([]);
  const indicatorRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  const menuItems = [
    { name: 'Home', href: '#home' },
    { name: 'About Us', href: '#about' },
    { name: 'Aim', href: '#aim' },
    { name: 'Contact Us', href: '#contact' }
  ];

  useEffect(() => {
    // Initial animation
    if (navRef.current) {
      navRef.current.style.transform = 'translateX(-50%) translateY(-20px)';
      navRef.current.style.opacity = '0';
      
      setTimeout(() => {
        navRef.current.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        navRef.current.style.transform = 'translateX(-50%) translateY(0)';
        navRef.current.style.opacity = '1';
      }, 100);
    }

    // Animate menu items
    menuItemsRef.current.forEach((item, index) => {
      if (item) {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.8)';
        
        setTimeout(() => {
          item.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
        }, 200 + (index * 80));
      }
    });

    // Set initial indicator position
    setTimeout(() => {
      if (menuItemsRef.current[0] && indicatorRef.current) {
        const firstItem = menuItemsRef.current[0];
        indicatorRef.current.style.width = `${firstItem.offsetWidth}px`;
        indicatorRef.current.style.left = `${firstItem.offsetLeft}px`;
        setIsInitialized(true);
      }
    }, 600);
  }, []);

  const handleMenuHover = (index, element) => {
    if (!isInitialized) return;
    
    setActiveIndex(index);
    
    // Lift effect
    element.style.transform = 'translateY(-6px)';
    
    // Move indicator
    if (indicatorRef.current) {
      const itemWidth = element.offsetWidth;
      const itemLeft = element.offsetLeft;
      indicatorRef.current.style.width = `${itemWidth}px`;
      indicatorRef.current.style.left = `${itemLeft}px`;
    }
  };

  const handleMenuLeave = (element) => {
    element.style.transform = 'translateY(0)';
  };

  return (
    <nav className="fixed top-6 left-[66%] -translate-x-1/2 z-50">
      <div
        ref={navRef}
        className="relative px-3 py-1 rounded-full"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500/20 to-red-600/20 blur-xl -z-10" />
        
        {/* Menu Items */}
        <div className="flex items-center gap-1.5 relative">
          {/* Active indicator */}
          <div
            ref={indicatorRef}
            className="absolute bottom-0 h-0.5 rounded-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500 ease-out"
            style={{ width: 0, left: 0 }}
          />
          
          {menuItems.map((item, index) => (
            <a
              key={item.name}
              href={item.href}
              ref={(el) => (menuItemsRef.current[index] = el)}
              onMouseEnter={(e) => handleMenuHover(index, e.currentTarget)}
              onMouseLeave={(e) => handleMenuLeave(e.currentTarget)}
              className="relative px-2.5 py-1 text-white/90 hover:text-white font-medium whitespace-nowrap text-sm transition-all duration-300"
              style={{ transitionProperty: 'transform, color' }}
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;