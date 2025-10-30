<?php

namespace App\Http\Controllers;

use App\Models\UserEmailVerify;
use App\Mail\VerificationCodeMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class UserEmailVerifyController extends Controller
{
    public function create(Request $request) {
        $request->validate([
            'email' => 'required|email'
        ]);

        $verify = UserEmailVerify::where('email', $request->email)->whereNotNull('user_id')->first();

        if ($verify && $verify->user_id) {
            return response()->json([
                'message' => 'Email already exist.'
            ]);
        }

        $code  = rand(100000, 999999);
        $expire = now()->addMinutes(15);
        
        if ($verify) {
            $verify->update([
                'code' => $code,
                'expires_at' => $expire
            ]);
        } else {
            UserEmailVerify::create([
                'email' => $request->email,
                'code' => $code,
                'expires_at' => $expire
            ]);
        }

        Mail::to($request->email)->send(new VerificationCodeMail($code));

        return response()->json([
            'success' => true,
            'message' => 'Email sent.'
        ]);
    }
}
