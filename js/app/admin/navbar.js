import { bs } from '../../libs/bootstrap.js';

export const navbar = (() => {

    /**
     * @param {HTMLElement} btn
     * @param {string} id
     * @returns {void}
     */
    const showActiveTab = (btn, id) => {
        document.querySelectorAll('.navbar button').forEach((b) => {
            if (b.classList.contains('active')) {
                b.classList.remove('active');
            }
        });

        bs.tab(id).show();
        btn.classList.add('active');
    };

    /**
     * @param {HTMLElement} btn
     * @returns {void}
     */
    const buttonNavHome = (btn) => {
        showActiveTab(btn, 'button-home');
    };

    /**
     * @param {HTMLElement} btn
     * @returns {void}
     */
    const buttonNavSetting = (btn) => {
        showActiveTab(btn, 'button-setting');
    };
    /**
     * @param {HTMLElement} btn
     * @returns {void}
     */
    const buttonNavComments = (btn) => {
        showActiveTab(btn, 'button-wishes');
    };
    /**
     * @param {HTMLElement} btn
     * @returns {void}
     */
    const buttonNavSecurity = (btn) => {
        showActiveTab(btn, 'button-security');
    };

    return {
        buttonNavHome,
        buttonNavSetting,
        buttonNavComments,
        buttonNavSecurity
    };
})();