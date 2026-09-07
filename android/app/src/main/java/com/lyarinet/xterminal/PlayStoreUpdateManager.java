package com.lyarinet.xterminal;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Log;
import android.widget.Toast;

import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallState;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

/**
 * PlayStoreUpdateManager
 *
 * Official Google Play In-App Updates Integration.
 * Automatically checks Google Play Store for new versions of xTerminal on app launch.
 * If an update is detected, prompts the user and handles the in-app update flow (Flexible/Immediate).
 */
public class PlayStoreUpdateManager {
    private static final String TAG = "PlayStoreUpdateManager";
    public static final int REQUEST_CODE_APP_UPDATE = 7182;

    private static volatile PlayStoreUpdateManager sInstance;

    private AppUpdateManager mAppUpdateManager;
    private InstallStateUpdatedListener mInstallListener;
    private boolean mIsListenerRegistered = false;

    public static PlayStoreUpdateManager getInstance() {
        if (sInstance == null) {
            synchronized (PlayStoreUpdateManager.class) {
                if (sInstance == null) {
                    sInstance = new PlayStoreUpdateManager();
                }
            }
        }
        return sInstance;
    }

    private PlayStoreUpdateManager() {}

    /**
     * Check Google Play Store for updates on startup.
     */
    public void checkForAppUpdate(Activity activity) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            return;
        }

        try {
            if (mAppUpdateManager == null) {
                mAppUpdateManager = AppUpdateManagerFactory.create(activity.getApplicationContext());
            }

            setupInstallListener(activity);

            mAppUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                int availability = appUpdateInfo.updateAvailability();
                Log.i(TAG, "Play Store Update availability status: " + availability);

                if (availability == UpdateAvailability.UPDATE_AVAILABLE) {
                    int availableVersionCode = appUpdateInfo.availableVersionCode();
                    Log.i(TAG, "New xTerminal update found on Play Store! Version code: " + availableVersionCode);

                    // Prefer Flexible update so user can continue using the terminal while downloading
                    if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                        startUpdate(activity, appUpdateInfo, AppUpdateType.FLEXIBLE);
                    } else if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                        startUpdate(activity, appUpdateInfo, AppUpdateType.IMMEDIATE);
                    }
                } else if (availability == UpdateAvailability.UPDATE_NOT_AVAILABLE) {
                    Log.i(TAG, "xTerminal is up to date with Google Play Store.");
                }
            }).addOnFailureListener(e -> {
                Log.w(TAG, "Failed to check Google Play Store for updates: " + e.getMessage());
            });
        } catch (Exception e) {
            Log.e(TAG, "Error initializing Play Store update manager: " + e.getMessage(), e);
        }
    }

    private void startUpdate(Activity activity, AppUpdateInfo appUpdateInfo, int updateType) {
        try {
            AppUpdateOptions options = AppUpdateOptions.newBuilder(updateType).build();
            mAppUpdateManager.startUpdateFlowForResult(
                appUpdateInfo,
                activity,
                options,
                REQUEST_CODE_APP_UPDATE
            );
            Log.i(TAG, "Started Play Store in-app update flow (type=" + updateType + ")");
        } catch (Exception e) {
            Log.e(TAG, "Could not start Play Store update flow: " + e.getMessage(), e);
        }
    }

    private void setupInstallListener(Activity activity) {
        if (mIsListenerRegistered || mAppUpdateManager == null) {
            return;
        }

        mInstallListener = (InstallState state) -> {
            if (state.installStatus() == InstallStatus.DOWNLOADED) {
                Log.i(TAG, "xTerminal update package downloaded from Google Play Store.");
                showUpdateDownloadedDialog(activity);
            }
        };

        mAppUpdateManager.registerListener(mInstallListener);
        mIsListenerRegistered = true;
    }

    /**
     * Called in Activity onResume to handle pending or interrupted updates.
     */
    public void onResume(Activity activity) {
        if (mAppUpdateManager == null || activity == null || activity.isFinishing()) {
            return;
        }

        mAppUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
            // 1. If flexible update already downloaded, prompt user to complete
            if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
                showUpdateDownloadedDialog(activity);
            }
            // 2. If immediate update was interrupted, resume it
            else if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                try {
                    AppUpdateOptions options = AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build();
                    mAppUpdateManager.startUpdateFlowForResult(
                        appUpdateInfo,
                        activity,
                        options,
                        REQUEST_CODE_APP_UPDATE
                    );
                } catch (Exception e) {
                    Log.w(TAG, "Could not resume immediate update: " + e.getMessage());
                }
            }
        }).addOnFailureListener(e -> {
            Log.d(TAG, "onResume update check: " + e.getMessage());
        });
    }

    /**
     * Clean up listener on Activity onDestroy.
     */
    public void onDestroy() {
        if (mAppUpdateManager != null && mInstallListener != null && mIsListenerRegistered) {
            try {
                mAppUpdateManager.unregisterListener(mInstallListener);
            } catch (Exception ignored) {}
            mIsListenerRegistered = false;
        }
    }

    /**
     * Show friendly dialog when update is ready to be applied.
     */
    private void showUpdateDownloadedDialog(Activity activity) {
        if (activity == null || activity.isFinishing() || activity.isDestroyed()) {
            return;
        }

        activity.runOnUiThread(() -> {
            try {
                new AlertDialog.Builder(activity)
                    .setTitle("xTerminal Update Ready")
                    .setMessage("A new version of xTerminal has been downloaded from Google Play Store. Restart now to apply the update?")
                    .setPositiveButton("Restart Now", (dialog, which) -> {
                        if (mAppUpdateManager != null) {
                            mAppUpdateManager.completeUpdate();
                        }
                    })
                    .setNegativeButton("Later", null)
                    .setCancelable(true)
                    .show();
            } catch (Exception e) {
                Log.w(TAG, "Could not display update dialog: " + e.getMessage());
                Toast.makeText(activity, "Update downloaded. Restart xTerminal to apply.", Toast.LENGTH_LONG).show();
            }
        });
    }

    /**
     * Direct link helper to open xTerminal on Google Play Store.
     */
    public static void openPlayStorePage(Context context) {
        if (context == null) return;
        final String pkg = context.getPackageName();
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + pkg));
            webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(webIntent);
        }
    }
}
