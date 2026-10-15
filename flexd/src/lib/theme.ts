/**
 * FLEXD is dark only: <html data-theme="dark"> is fixed in the layout and there is no switch.
 * This marks a returning visitor before first paint (phones then skip the home headline).
 */
export const RETURNING_KEY = "flexd-seen";

export const returningBootScript = `(function(){try{var k="${RETURNING_KEY}",d=document.documentElement;if(localStorage.getItem(k))d.dataset.returning="1";else localStorage.setItem(k,"1")}catch(e){}})()`;
