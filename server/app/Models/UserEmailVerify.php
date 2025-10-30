<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserEmailVerify extends Model
{
    protected $table = 'user_email_verify';

    protected $fillable = [
        'user_id',
        'email',
        'code',
        'expires_at',
    ];

    public $timestamps = true;
}
