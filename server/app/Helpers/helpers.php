<?php

use Illuminate\Support\Facades\Mail;
use App\Mail\MultiMailSender;
use App\Models\User;
use App\Models\Admin;

if (!function_exists('send_bulk_email')) {
  /**
   * Send bulk emails to recipients.
   * 
   * Recipients can be:
   * - Email addresses
   * - User IDs (numeric)
   * - Admin roles (string)
   */
  function send_bulk_email($recipients, $subject, $message)
  {
    // Normalize to array
    if (!is_array($recipients)) {
      $recipients = [$recipients];
    }

    $emails = [];

    foreach ($recipients as $recipient) {

      // Case 1: User ID (numeric)
      if (is_numeric($recipient)) {
        $user = User::find($recipient);
        if ($user && filter_var($user->email, FILTER_VALIDATE_EMAIL)) {
          $emails[] = $user->email;
        }

      // Case 2: Email address
      } elseif (filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
        $emails[] = $recipient;

      // Case 3: Admin role (string)
      } elseif (is_string($recipient)) {
          $admins = Admin::where('admin_role', $recipient)->pluck('email')->toArray();
          foreach ($admins as $adminEmail) {
            if (filter_var($adminEmail, FILTER_VALIDATE_EMAIL)) {
              $emails[] = $adminEmail;
            }
          }
        }
    }

    // Remove duplicates
    $emails = array_unique($emails);

    // Send emails
    foreach ($emails as $email) {
      try {
        Mail::to($email)->send(new MultiMailSender($subject, $message));
      } catch (\Exception $e) {
        \Log::error("Mail sending failed to {$email}: " . $e->getMessage());
      }
    }
  }
}
