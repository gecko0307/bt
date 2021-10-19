function timeline(tl) {
    tl.fromTo("#t1", 0.5, { opacity: 0 }, { opacity: 1 }, 0.0);
    
    tl.fromTo("#t1", 0.5, { opacity: 1 }, { opacity: 0 }, 2.5);
    tl.fromTo("#t2", 0.5, { opacity: 0 }, { opacity: 1 }, 3.0);
    
    tl.fromTo("#t2", 0.5, { opacity: 1 }, { opacity: 0 }, 5.5);
    tl.fromTo("#t3", 0.5, { opacity: 0 }, { opacity: 1 }, 6.0);
    
    tl.fromTo("#t3", 0.5, { opacity: 1 }, { opacity: 0 }, 8.5);
    tl.fromTo("#t4", 0.5, { opacity: 0 }, { opacity: 1 }, 9.0);
    
    tl.fromTo("#t4", 0.5, { opacity: 1 }, { opacity: 0 }, 11.5);
    tl.fromTo("#t1", 0.5, { opacity: 0 }, { opacity: 0 }, 11.5);
}

module.exports = {
    timeline
};
