export var SystemFolder;
(function (SystemFolder) {
    SystemFolder["INBOX"] = "Inbox";
    SystemFolder["SENT"] = "Sent";
    SystemFolder["DRAFTS"] = "Drafts";
    SystemFolder["SPAM"] = "Spam";
    SystemFolder["TRASH"] = "Trash";
    SystemFolder["SCHEDULED"] = "Scheduled";
    SystemFolder["ARCHIVE"] = "Archive";
})(SystemFolder || (SystemFolder = {}));
export const SYSTEM_FOLDERS = Object.values(SystemFolder);
// Labels are for tagging, Starred is a special tag
export var SystemLabel;
(function (SystemLabel) {
    SystemLabel["STARRED"] = "Starred";
    SystemLabel["SNOOZED"] = "Snoozed";
})(SystemLabel || (SystemLabel = {}));
export const SYSTEM_LABELS = Object.values(SystemLabel);
export var ActionType;
(function (ActionType) {
    ActionType["REPLY"] = "reply";
    ActionType["FORWARD"] = "forward";
    ActionType["DRAFT"] = "draft";
})(ActionType || (ActionType = {}));
