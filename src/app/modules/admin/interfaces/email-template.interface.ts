export enum EmailNotificationType {
  // Social
  REACTION_NOTIFICATION              = 'REACTION_NOTIFICATION',
  COMMENT_NOTIFICATION               = 'COMMENT_NOTIFICATION',
  TAG_NOTIFICATION                   = 'TAG_NOTIFICATION',
  // Friends
  FRIEND_REQUEST_SENT                = 'FRIEND_REQUEST_SENT',
  FRIEND_REQUEST_ACCEPTED            = 'FRIEND_REQUEST_ACCEPTED',
  // Groups
  GROUP_MEMBER_JOINED_ADMIN          = 'GROUP_MEMBER_JOINED_ADMIN',
  GROUP_MEMBER_APPROVED              = 'GROUP_MEMBER_APPROVED',
  GROUP_MEMBER_REMOVED               = 'GROUP_MEMBER_REMOVED',
  GROUP_MEMBER_BANNED                = 'GROUP_MEMBER_BANNED',
  // Tips
  TIP_RECEIVED                       = 'TIP_RECEIVED',
  // Creator subscriptions
  CREATOR_SUBSCRIPTION_ACTIVATED     = 'CREATOR_SUBSCRIPTION_ACTIVATED',
  CREATOR_SUBSCRIPTION_EXPIRED       = 'CREATOR_SUBSCRIPTION_EXPIRED',
  CREATOR_SUBSCRIPTION_EXPIRING_SOON = 'CREATOR_SUBSCRIPTION_EXPIRING_SOON',
  // Events / tickets
  TICKET_CONFIRMED                   = 'TICKET_CONFIRMED',
  EVENT_CANCELLED                    = 'EVENT_CANCELLED',
  // Moderation
  REPORT_RESOLVED                    = 'REPORT_RESOLVED',
  // Auth / account
  WELCOME_EMAIL                      = 'WELCOME_EMAIL',
  FORGOT_PASSWORD                    = 'FORGOT_PASSWORD',
  RESET_PASSWORD_CONFIRM             = 'RESET_PASSWORD_CONFIRM',
  PUBLICATION_REPORT                 = 'PUBLICATION_REPORT',
  INVITATION_CODE                    = 'INVITATION_CODE',
}

export interface EmailTemplate {
  _id: string;
  type: EmailNotificationType;
  subject: string;
  title: string;
  greet: string;
  message: string;
  subMessage: string;
  buttonMessage: string;
  urlSlug?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const EMAIL_TEMPLATE_VARIABLES: Record<EmailNotificationType, string[]> = {
  [EmailNotificationType.REACTION_NOTIFICATION]:              ['{{actorName}}', '{{publicationId}}'],
  [EmailNotificationType.COMMENT_NOTIFICATION]:               ['{{actorName}}', '{{commentPreview}}', '{{publicationId}}'],
  [EmailNotificationType.TAG_NOTIFICATION]:                   ['{{actorName}}', '{{publicationId}}'],
  [EmailNotificationType.FRIEND_REQUEST_SENT]:                ['{{actorName}}', '{{actorId}}'],
  [EmailNotificationType.FRIEND_REQUEST_ACCEPTED]:            ['{{actorName}}', '{{actorId}}'],
  [EmailNotificationType.GROUP_MEMBER_JOINED_ADMIN]:          ['{{actorName}}', '{{groupName}}', '{{groupId}}'],
  [EmailNotificationType.GROUP_MEMBER_APPROVED]:              ['{{groupName}}', '{{groupId}}'],
  [EmailNotificationType.GROUP_MEMBER_REMOVED]:               ['{{groupName}}', '{{groupId}}'],
  [EmailNotificationType.GROUP_MEMBER_BANNED]:                ['{{groupName}}', '{{groupId}}'],
  [EmailNotificationType.TIP_RECEIVED]:                       ['{{senderName}}', '{{amount}}', '{{recipientId}}'],
  [EmailNotificationType.CREATOR_SUBSCRIPTION_ACTIVATED]:     ['{{creatorName}}', '{{creatorId}}', '{{expiresAt}}'],
  [EmailNotificationType.CREATOR_SUBSCRIPTION_EXPIRED]:       ['{{creatorName}}', '{{creatorId}}'],
  [EmailNotificationType.CREATOR_SUBSCRIPTION_EXPIRING_SOON]: ['{{creatorName}}', '{{creatorId}}', '{{expiresAt}}'],
  [EmailNotificationType.TICKET_CONFIRMED]:                   ['{{eventTitle}}', '{{eventDate}}', '{{eventId}}'],
  [EmailNotificationType.EVENT_CANCELLED]:                    ['{{eventTitle}}', '{{eventId}}'],
  [EmailNotificationType.REPORT_RESOLVED]:                    [],
  [EmailNotificationType.WELCOME_EMAIL]:                      ['{{userName}}'],
  [EmailNotificationType.FORGOT_PASSWORD]:                    ['{{userName}}'],
  [EmailNotificationType.RESET_PASSWORD_CONFIRM]:             ['{{userName}}'],
  [EmailNotificationType.PUBLICATION_REPORT]:                 ['{{userName}}', '{{publicationId}}', '{{reportReason}}'],
  [EmailNotificationType.INVITATION_CODE]:                    ['{{code}}', '{{platformName}}'],
};

export const EMAIL_TYPE_LABELS: Record<EmailNotificationType, string> = {
  [EmailNotificationType.REACTION_NOTIFICATION]:              'Reacción a publicación',
  [EmailNotificationType.COMMENT_NOTIFICATION]:               'Comentario en publicación',
  [EmailNotificationType.TAG_NOTIFICATION]:                   'Mención / etiqueta',
  [EmailNotificationType.FRIEND_REQUEST_SENT]:                'Solicitud de amistad',
  [EmailNotificationType.FRIEND_REQUEST_ACCEPTED]:            'Solicitud aceptada',
  [EmailNotificationType.GROUP_MEMBER_JOINED_ADMIN]:          'Nuevo miembro en grupo (admin)',
  [EmailNotificationType.GROUP_MEMBER_APPROVED]:              'Solicitud de grupo aprobada',
  [EmailNotificationType.GROUP_MEMBER_REMOVED]:               'Removido de grupo',
  [EmailNotificationType.GROUP_MEMBER_BANNED]:                'Suspendido de grupo',
  [EmailNotificationType.TIP_RECEIVED]:                       'Tip recibido',
  [EmailNotificationType.CREATOR_SUBSCRIPTION_ACTIVATED]:     'Suscripción creador activada',
  [EmailNotificationType.CREATOR_SUBSCRIPTION_EXPIRED]:       'Suscripción creador vencida',
  [EmailNotificationType.CREATOR_SUBSCRIPTION_EXPIRING_SOON]: 'Suscripción creador por vencer',
  [EmailNotificationType.TICKET_CONFIRMED]:                   'Ticket confirmado',
  [EmailNotificationType.EVENT_CANCELLED]:                    'Evento cancelado',
  [EmailNotificationType.REPORT_RESOLVED]:                    'Reporte revisado',
  [EmailNotificationType.WELCOME_EMAIL]:                      'Bienvenida / Verificación',
  [EmailNotificationType.FORGOT_PASSWORD]:                    'Olvidé mi contraseña',
  [EmailNotificationType.RESET_PASSWORD_CONFIRM]:             'Contraseña restablecida',
  [EmailNotificationType.PUBLICATION_REPORT]:                 'Reporte de publicación',
  [EmailNotificationType.INVITATION_CODE]:                    'Código de invitación',
};
