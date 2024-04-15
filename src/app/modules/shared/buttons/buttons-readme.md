# mode of use of buttons in the application
#### import button module
```bash
import { WorkyButtonsModule } from '../shared/buttons/buttons.module';
```

#### in the component import theme and type
```bash
import { WorkyButtonType, WorkyButtonTheme } from './models/worky-button-model';
```

#### Then, inside the component class, declare the variables
```bash
  WorkyButtonType = WorkyButtonType;

  WorkyButtonTheme = WorkyButtonTheme;
```


<pre><code> <!-- HTML -->
&lt;worky-buttons
  [workyButtonType]="WorkyButtonType.Flat"
  [theme]="WorkyButtonTheme.Basic"
  [width]="'50%'"
  (click)="login()"&gt;
  &lt;span prefix-icon class="material-icons"&gt;login&lt;/span&gt; <!-- Icon located on the left side -->
  &lt;span basic-button-text&gt;Login&lt;/span&gt;
  &lt;span suffix-icon class="material-icons"&gt;add_circle_outline&lt;/span&gt; <!-- Icon located on the right side -->
&lt;/worky-buttons&gt;
</code></pre>

#### List of icons to use
<code>
https://fonts.google.com/icons
</code>