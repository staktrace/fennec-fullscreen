/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Full Screen Mobile Add-on.
 *
 * The Initial Developer of the Original Code is
 * Mozilla Corporation.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 * * Matt Brubeck <mbrubeck@mozilla.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the LGPL or the GPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var Cc = Components.classes;
var Ci = Components.interfaces;

var gMenuId = null;
var gContextMenuId = null;
var gStringBundle = null;

Components.utils.import("resource://gre/modules/Services.jsm");

function isNativeUI() {
  let appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
  return (appInfo.ID == "{aa3c5121-dab2-40e2-81ca-7ea25febc110}");
}

function toast(win, msg) {
  if (isNativeUI())
    win.NativeWindow.toast.show(msg, "long");
  else {
    let toaster = Cc["@mozilla.org/toaster-alerts-service;1"].getService(Ci.nsIAlertsService);
    toaster.showAlertNotification(null, msg, "", false, "", null);
  }
}


function load(win) {
  if (!gStringBundle)
    gStringBundle = Services.strings.createBundle("chrome://fullscreen/locale/fullscreen.properties");

  function toggle(enable) {
    if (typeof enable != "boolean")
      enable = !win.fullScreen;
    win.fullScreen = enable;
    Services.prefs.setBoolPref("extensions.fullscreen.active", enable);
    if (enable) {
      let msgString = gStringBundle.GetStringFromName("fullscreen.toExitDesc");
      toast(win, msgString);
    }
    return enable;
  }

  if (isNativeUI()) {
    let menuString = gStringBundle.GetStringFromName("fullscreen.menu");
    gMenuId = win.NativeWindow.menu.add(menuString, enableImg, toggle);

    let selector = {
      matches: function matches() { return win.fullScreen; }
    };
    let exitString = gStringBundle.GetStringFromName("fullscreen.exitButton");
    gContextMenuId = win.NativeWindow.contextmenus.add(exitString, selector, toggle.bind(false));

    let active = true;
    try {
      active = Services.prefs.getBoolPref("extensions.fullscreen.active");
    } catch (e) {}
    toggle(active);
  } else {
    let document = win.document;

    // Create button.
    let button = document.createElement("toolbarbutton");
    let buttonLabelString = gStringBundle.GetStringFromName("fullscreen.menu");
    button.setAttribute("id", "fullscreen-button");
    button.setAttribute("class", "appmenu-button");
    button.setAttribute("label", buttonLabelString);

    let menu = document.getElementById("appmenu");
    menu.insertBefore(button, menu.firstChild);

    function oncommand(enable) {
      let result = toggle(enable);
      button.setAttribute("image", result ? disableImg : enableImg);
    }

    button.addEventListener("command", oncommand, false);

    // setTimeout is needed to avoid a crash
    win.setTimeout(function() {
      let active = true;
      try {
        active = Services.prefs.getBoolPref("extensions.fullscreen.active");
      } catch (e) {}
      oncommand(active);
    }, 0);
  }
}

function unload(win) {
  if (isNativeUI()) {
    win.NativeWindow.menu.remove(gMenuId);
    win.NativeWindow.contextmenus.remove(gContextMenuId);
  } else {
    let button = win.document.getElementById("fullscreen-button");
    button.parentNode.removeChild(button);
  }
  win.fullScreen = false;
}

var listener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let win = aWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                     .getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    win.addEventListener("UIReady", function(aEvent) {
      win.removeEventListener(aEvent.name, arguments.callee, false);
      load(win);
    }, false);
  },

  // Unused:
  onCloseWindow: function(aWindow) { },
  onWindowTitleChange: function(aWindow, aTitle) { }
};

/* Bootstrap Interface */

function startup(aData, aReason) {
  // Load in existing windows.
  let enumerator = Services.wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    load(win);
  }

  // Load in future windows.
  Services.wm.addListener(listener);
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN)
    return;

  Services.wm.removeListener(listener);

  let enumerator = Services.wm.getEnumerator("navigator:browser");
  while(enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    unload(win);
  }
}

function install(aData, aReason) {}
function uninstall(aData, aReason) {}

// Images

const enableImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAqCAYAAADFw8lbAAAAAXNSR0IArs4c6QAAA8NJREFUWMPtmM1P40YYxp8kM4OJbZIoERAlYKIVglghhKSq+nHhku2hUtVLjz0Udf+gSvREuCOx6rXbLgdOK7VlK9ELOYZDAgKHTQQEBX9MLzXypnG+HKDq8ko+2Bp7fnreeed9xsBTfKDh67injLGvKaXP/H7/owBZloV2u31gGMae8zlx3kiS9CKTyfwYDodBKX1wSM45dF2Hpmk4PDz83DCMN11BZ2ZmstlsFtPT048Gent7i1qthuPj46ymaW/cFEU8HkcsFvMMyjkfbg36fHeKmqaJiYkJuKbe7/eDEAJCCAKBgCdAzjlM04RlWT2hfT4fAoEA7JrgnINSis4aIZ0v2YOHVcQZpmmiWq0eb25urjcajUq/8RsbG68KhcIXhBDXef2dani9LMuCaZpgjCnFYnFfEISFfqCapuHm5uZO/W6w/m6p83LZmaGUIhqNKqurq31hr6+voet6T1DSC3TkzdnngyiKiMfjaLVaSrPZ/KlcLhcAcLe90wk5EOg41qhdmMFgEKIovjs5OfneDbJbFm34e1eUcw7DMHBxcfFud3e32Gw2/xzknaEUdW4vXiDPz88bW1tbRU3T3g7SNvuJNFZFh4D8FMAJgMpIivZb0INAnp2dNba3t4uaph10G0cI+WxhYeGVYRgXlUpl3YYdKfXDgjqUbJZKpef1er0rJKX0k7W1tZ8VRZFN05Qjkcj+0dHRut2ue83rueptSE3TmqVSqViv1/9wgfw4n8//oqrqVDweh2VZCIVCyuzs7L4kSc1+XdFT6u1+/g/k8x6QH+Xz+V9VVZ2am5uDJEngnIMxhlgsplBKQSntWcieUm9ZFlqtFnZ2dr6r1+u/u0Dmc7nc63Q6HUomk5Ak6c7wyLKMycnJO2MysKLDgNpqXl1d4fT09C8XyLVcLrenqmrYhnS6IrvVDrLsPPd6wzCwvLz8AwDWAbmazWZfp9PpSCKReA/SDaaXQCOD2iEIApaWlr6cn5/ftWEZYysrKyt7qqpGk8kkZFn+F+Sg3++a+n6Du5mPYDCIRCKBQqHwlSiKbxuNxm+KonyzuLg41U3JQVvp2LcnQgjC4TBSqRRCoVCm3W5nZFlGNBodGvJeismpKmMMkUgEoijCsiwQQsAYGxrSOf+9uadAIABBEN470oxibgbuTF5MiRNwVAf2oA7f6zH7/wPqxeY9uKLjOjON+w/LU+qfium/Bmqapjvo5eVlWdd1GIbxaKC6rkPXdbRarXKvX+NCKpX6NhaLPevsMg+paK1WO6hWqy/xFE8B/A3MvO8+0QWEZAAAAABJRU5ErkJggg==";

const disableImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACoAAAAqCAYAAADFw8lbAAAAAXNSR0IArs4c6QAAA+NJREFUWMPtmUtP41YUx48dX+PEseRF5MQsIoURYRYoogJhJFYzsI3UdZlpZ9F+jvYzIBWoomkDBMSiH6GKxGa6QaqCCs1DSM0igdAUCE4csK/tbsYoLzvOhEDV5khZOLmP3z3n/M+91wEY2//UiI5nRNP05wihFyRJPguQYRhwf39/hDH+pfV7qvXB7/d/Mzs7+z3P84AQenJI0zRB0zSoVquQyWSWMcYfeoIGg8FYLBYDQRCeDVRVVSiXy1AsFmPVavWDnUdBFEUIBAIjAzVNsz33CKLLo7quw8TEBNiGniRJoCgKKIoCj8czEkDDMMAwjIf5LC1YwKZpAkIIOjVC9VqdaZpdK3+s/Mvn878dHBy883g89Nra2m4kEnlJUZStxx+c2DnYKD4flQwnJyeZ9fX11cvLy+Pz8/Ojzc3NV7lcLquqKhiG0dbHEXQUsBbk6enpcSqVWgGAK2uuRqNxkUgkVq+uru4wxm2wTwpqQWaz2d9TqdSqLMt/d87XbDZLxWLxT4yxo0cpu3waNketnMzlcqe7u7sr9Xr9r17tgsHg1yzLvtR1vW1eS3C2oE6rsttJVFVVaJr2EQQBBEG0CuePnZ2d141G47JXX47j3i0sLPzAsiyQJDl4jrpNAV3X4e7uDjY2NuI3NzcKxhh0XQdVVSGfz+c+QlbsICVJej81NUXyPP9QDh89Rw3DAIwx1Go1ODs7S29tbcWr1arSbDahUCjkt7e3XzUajYtekCzLfiVJ0vuZmRkyFAoBwzB9o0l2hnFQsciyDAAApVIpnUgk4plM5jiZTL5WFOXcBvLLpaWlH6PRKCmKIvh8vq767UpMbnO0VdWWVSqV9P7+/mcAYNhAvpUk6Sc7SKeC/8mqb/Vqp75sIN9IkpR0gnSam3IKvRtQN9WBZdk3i4uL29FolJycnLSFdNpGhwq9m3Zer/eL+fn55PT0NCmKIni93r6QIwHtZx6P5yIUCt0LguBjGMYRciTlye2C6vV6+vDwMK6qqjLMeEODurFKpZLe29uL12o1xW0JdAz9IBDW7wghCIfD393e3gLGuHsCigKfzwccx0GhUPh1bm5uBSHUdrL/pBwdJP9IkgSO42B5efnb6+tr0HW9+5pLEEDTNPA8D4Ig9B370cVkQfj9fgiHwyCKom0fgiCAoihgGObh8DFofR769IQQAo7j+ra3TlZuVO9qZxoU1EqBYW6iIw/9qK7T/x3QQfb6Z/foqO71w+bvOPRjMf3bQDu34zZQWZazmqaB9dbiOUzTNNA0DRRFyTq9GmcikcjbQCDwwu508xQeLZfLR6VS6efxPxdjA4B/APhS2Ff9oBe9AAAAAElFTkSuQmCC";
