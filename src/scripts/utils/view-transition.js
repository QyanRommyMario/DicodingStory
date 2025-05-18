const applyViewTransition = async (updateCallback) => {
  if (!document.startViewTransition) {
    await updateCallback();
    return;
  }

  const transition = document.startViewTransition(async () => {
    await updateCallback();
  });

  return transition.finished;
};

const applyCustomAnimation = (
  elementSelector,
  { name = "fade", duration = 300, easing = "ease" } = {}
) => {
  const element = document.querySelector(elementSelector);
  if (!element) return;

  element.style.viewTransitionName = name;

  const style = document.createElement("style");
  style.textContent = `
      @keyframes ${name}-in {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
  
      @keyframes ${name}-out {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
      }
  
      ::view-transition-old(${name}) {
        animation: ${duration}ms ${easing} both ${name}-out;
      }
  
      ::view-transition-new(${name}) {
        animation: ${duration}ms ${easing} both ${name}-in;
      }
    `;

  document.head.appendChild(style);

  setTimeout(() => {
    document.head.removeChild(style);
  }, duration + 100);
};

export { applyViewTransition, applyCustomAnimation };
