<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class MultiMailSender extends Mailable
{
  use Queueable, SerializesModels;

  public $subjectText;
  public $bodyContent;

  public function __construct($subjectText, $bodyContent)
  {
    $this->subjectText = $subjectText;
    $this->bodyContent = $bodyContent;
  }

  public function build()
  {
    return $this->subject($this->subjectText)
      ->view('emails.multi_mail')
      ->with([
          'bodyContent' => $this->bodyContent
      ]);
  }
}
