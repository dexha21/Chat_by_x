<?php

namespace App\Http\Controllers;

use App\Mail\VerificationCodeMail;
use App\Models\User;
use App\Models\UserEmailVerify;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rules;

class PasswordResetController extends Controller
{
    public function sendCode(Request $request) {
        $request->validate([
            'email' => 'required|email'
        ]);

        $verify = UserEmailVerify::where('email', $request->email)->whereNotNull('user_id')->first();

        if(!$verify) {
            return response()->json([
                'message' => 'Email doesn\'t exist'
            ]);
        }

        $code  = rand(100000, 999999);
        $expire = now()->addMinutes(15);

        $verify->update([
            'code' => $code,
            'expires_at' => $expire
        ]);

        Mail::to($request->email)->send(new VerificationCodeMail($code));

        return response()->json([
            'success' => true,
            'message' => 'code sent'
        ]);
    }

    public function resetPassword(Request $request) {
        $request->validate([
            'email' => 'required|email',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'verification_code' => ['required', 'max:6'],
        ]);

        $verify = UserEmailVerify::where('email', $request->email)->where('code', $request->verification_code)->where('expires_at', '>=', Carbon::now())->first();

        if (!$verify) {
            return response()->json([
                'message' => 'Code doesn\'t exist or expired!'
            ]);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'message' => 'User not found.'
            ]);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        $token = $user->createToken('api-token')->plainTextToken;


        return response()->json([
            'success' => true,
            'message' => 'Signed in!',
            'user' => $user,
            'token' => $token
        ]);
    }
}
